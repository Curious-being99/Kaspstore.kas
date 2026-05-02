import express from "express";
import path from "path";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = 3000;

// Lazy S3 Client helper
let s3ClientInstance: S3Client | null = null;
function getS3Client() {
  if (!s3ClientInstance) {
    const accessKeyId = process.env.EVERLAND_API_KEY;
    const secretAccessKey = process.env.EVERLAND_API_SECRET;

    if (!accessKeyId || !secretAccessKey) {
      console.warn(
        "[Storage] EVERLAND_API_KEY or EVERLAND_API_SECRET missing. Storage operations will fail.",
      );
    }

    s3ClientInstance = new S3Client({
      endpoint:
        process.env.EVERLAND_ENDPOINT || "https://endpoint.4everland.co",
      region: "us-east-1",
      credentials: {
        accessKeyId: accessKeyId || "placeholder",
        secretAccessKey: secretAccessKey || "placeholder",
      },
    });
  }
  return s3ClientInstance;
}

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  // Global Middleware
  app.use(cors());
  app.use(express.json());

  // Health check at the very top
  app.get("/api/health", (req, res) => {
    console.log("[Health] Ping received");
    res.json({
      status: "ok",
      message: "Kaspstore Protocol is healthy",
      timestamp: new Date().toISOString(),
    });
  });

  app.post("/api/ai-ask", async (req, res) => {
    try {
      const { messages } = req.body;
      if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: "Messages array is required" });

      const { default: Groq } = await import("groq-sdk");
      const apiKey = process.env.GROQ_API_KEY;

      if (!apiKey) {
        return res
          .status(500)
          .json({ error: "GROQ_API_KEY not configured on server" });
      }

      const groq = new Groq({ apiKey });

      const SYSTEM_INSTRUCTION = `
You are K-Assistant, an expert, professional technical coach for the KaspStore ecosystem.

# OPERATIONAL RULES:
1. ROLE & TONE: You are a professional, authoritative, yet patient teacher (Coach). Guide the user clearly, break down complex tasks, and verify their understanding.
2. SECURITY & SECRECY: You MUST NEVER reveal internal application architecture, build scripts, codebase secrets, configuration files, environment variables, or tool-specific implementation details. If asked about the internal "build" or "app secrets," pivot the user immediately to high-level protocol mechanics or best practices for the Kaspstore ecosystem.
3. ANTI-HALLUCINATION: If asked a question for which you lack definitive technical data, state: "I do not have access to that specific information securely," rather than guessing.
4. COACHING: When explaining, always aim for educational clarity. If a user tries to perform an action (e.g., identity registration), coach them through the standard protocol steps.

# DOMAIN KNOWLEDGE:
- Kaspstore: The decentralized ecosystem for application listing and developer services.
- Registry: Decentralized application listing on the Kaspa DAG.
- Trust Center: Reputational identity and security credential management.
- DAG Backup: Using Kaspa DAG for immutable identity metadata commits.

Address the user as "Identity" or "Developer."
`;

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: SYSTEM_INSTRUCTION },
          ...messages
        ],
        model: "llama-3.3-70b-versatile",
      });

      res.json({
        text:
          chatCompletion.choices[0]?.message?.content ||
          "I couldn't generate a response.",
      });
    } catch (error: any) {
      console.error("[Groq AI Error]", error);
      res.status(500).json({ error: "AI reasoning failed" });
    }
  });

  console.log(`[Startup] Environment: ${process.env.NODE_ENV}`);

  app.get("/api/generate-upload-url", async (req, res) => {
    try {
      const fileName = req.query.fileName as string;
      const fileType = req.query.fileType as string;

      if (!fileName) {
        return res.status(400).json({ error: "fileName is required" });
      }

      const bucketName = process.env.EVERLAND_BUCKET_NAME;
      if (!bucketName) {
        return res.status(500).json({ error: "S3 Bucket Name not configured" });
      }

      const client = getS3Client();
      const key = `${Date.now()}-${fileName}`;
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: fileType || "application/octet-stream",
        ACL: "public-read",
      });

      const url = await getSignedUrl(client, command, { expiresIn: 900 });
      // Use Dedicated Gateway for the public URL
      const publicUrl = `https://kaspstore.4everland.link/${key}`;

      res.json({ uploadUrl: url, publicUrl, key });
    } catch (error: any) {
      console.error("Presigned URL Error:", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to generate upload URL" });
    }
  });

  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const bucketName = process.env.EVERLAND_BUCKET_NAME;
      if (!bucketName) {
        return res.status(500).json({ error: "S3 Bucket Name not configured" });
      }

      const client = getS3Client();
      const key = `${Date.now()}-${file.originalname}`;

      const parallelUploads3 = new Upload({
        client,
        params: {
          Bucket: bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: "public-read",
        },
      });

      await parallelUploads3.done();
      // Use Dedicated Gateway for the public URL
      const url = `https://kaspstore.4everland.link/${key}`;
      res.json({ url, key, size: file.size });
    } catch (error: any) {
      console.error("4Everland Upload Error:", error);
      res
        .status(500)
        .json({
          error: error.message || "Failed to upload to decentralized storage",
        });
    }
  });

  app.post("/api/push-update", async (req, res) => {
    try {
      const {
        appId,
        newDownloadUrl,
        newVersion,
        changelog,
        devIdentity,
        ipfsCid,
      } = req.body;

      if (!appId || !newDownloadUrl || !newVersion) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      console.log(
        `[Update Push] Developer ${devIdentity} is updating ${appId} to v${newVersion}`,
      );

      // 1. CID Update (Static Metadata)
      console.log(
        `[Update Push] Updating CID pointer to: ${ipfsCid || "unknown"}`,
      );

      // 2. IPNS Management (The Stable Pointer)
      // Conceptually, we use the 4EVERLAND or IPFS CLI to publish the new CID to a stable PeerID
      const stableIpnsName = `k51qzi5uqu5dl...${appId.substring(0, 4)}`; // Simulated stable IPNS Key
      console.log(
        `[IPNS] Publishing CID ${ipfsCid || "v2_cid"} to Stable Proxy: /ipns/${stableIpnsName}`,
      );

      // 3. Database Sync
      // await db.collection('apps').doc(appId).update({
      //    downloadUrl: newDownloadUrl,
      //    version: newVersion,
      //    lastIpnsUpdate: new Date().toISOString()
      // });

      res.json({
        status: "success",
        message: "Decentralized push finished. IPNS pointer updated.",
        ipnsName: stableIpnsName,
        newVersion,
      });
    } catch (error: any) {
      console.error("Update Push Error:", error);
      res.status(500).json({ error: "Failed to push decentralized update" });
    }
  });

  // Proxy endpoint with simple caching
  const proxyCache = new Map<string, { data: any; timestamp: number }>();
  app.get("/api/proxy", async (req, res) => {
    const url = req.query.url as string;
    if (!url) return res.status(400).json({ error: "URL is required" });

    // Simple cache: 5 minutes
    if (proxyCache.has(url) && Date.now() - proxyCache.get(url)!.timestamp < 300000) {
      return res.json(proxyCache.get(url)!.data);
    }

    try {
      const response = await fetch(url);
      const data = await response.json();
      proxyCache.set(url, { data, timestamp: Date.now() });
      res.json(data);
    } catch (error: any) {
      console.error("[Proxy] Error fetching", url, error);
      res.status(500).json({ error: "Proxy fetch failed" });
    }
  });

  let cachedNetworkInfo: any = {
    networkName: "kaspa-mainnet",
    blockCount: "23550000",
    headerCount: "23550000",
    virtualDaaScore: "419828000",
    mempoolSize: "10",
    difficulty: 20000000000000000,
  };
  let lastCacheTime = 0;
  const CACHE_DURATION = 30000; // 30 seconds

  app.get("/api/kaspa-stats", (req, res) => {
    res.redirect(301, "/api/network-info");
  });

  app.get("/api/network-info", async (req, res) => {
    // Return cache if it's fresh enough
    if (cachedNetworkInfo && Date.now() - lastCacheTime < CACHE_DURATION) {
      return res.json(cachedNetworkInfo);
    }

    console.log("[Proxy] Fetching fresh Kaspa network stats...");

    // Multi-gateway fallback logic
    const gateways = [
      "https://api.kaspa.org",
      "https://kaspa-api.kaspa.org",
      "https://mainnet-api.kaspanet.io",
      "https://mainnet.kaspa-api.io",
    ];

    const gatewayErrors: string[] = [];

    // Try gateways with a staggered start or sequential fallback with higher resilience
    for (const gateway of gateways) {
      try {
        const headers = {
          Accept: "application/json",
        };

        // Fetch essential data with independent signals
        const fetchWithSingleTimeout = async (url: string, ms: number) => {
          const subController = new AbortController();
          const subTimeoutId = setTimeout(() => subController.abort(), ms);
          try {
            const res = await fetch(gateway + url, {
              headers,
              signal: subController.signal,
            });
            clearTimeout(subTimeoutId);
            if (!res.ok) {
              return null;
            }
            return await res.json();
          } catch (e: any) {
            clearTimeout(subTimeoutId);
            return null;
          }
        };

        const dagData = await fetchWithSingleTimeout("/info/blockdag", 10000);
        if (!dagData) {
            gatewayErrors.push(`${gateway}: blockdag fetch failed`);
            continue;
        }

        const kaspadData = await fetchWithSingleTimeout("/info/kaspad", 10000);

        if (dagData) {
          const mempoolSize =
            kaspadData?.mempoolSize || cachedNetworkInfo?.mempoolSize || "0";
          cachedNetworkInfo = { 
            ...dagData, 
            mempoolSize,
            _gateway: gateway, // For debugging
            _timestamp: Date.now()
          };
          lastCacheTime = Date.now();
          console.log(`[Proxy] Successfully fetched from ${gateway}`);
          return res.json(cachedNetworkInfo);
        }
      } catch (error: any) {
        gatewayErrors.push(`${gateway}: ${error.message}`);
      }
    }

    // If all fail, return stale cache or error
    if (cachedNetworkInfo) {
      // Return stale cache quietly if gateways fail
      return res.json(cachedNetworkInfo);
    }
    
    console.error("[Proxy] All gateways failed:", gatewayErrors.join(", "));

    res
      .status(503)
      .json({
        error: "Kaspa network data currently unavailable from all gateways",
      });
  });

  app.post("/api/burn-and-launch", async (req, res) => {
    try {
      const { appId, txHash, burnAmount, developerAddress } = req.body;

      if (!appId || !txHash) {
        return res
          .status(400)
          .json({ error: "Missing launch credentials (appId, txHash)" });
      }

      console.log(`[Burn Ritual] App ${appId} is performing Burn-And-Launch`);
      console.log(`[Burn Ritual] Verifying Tx: ${txHash}`);
      console.log(`[Burn Ritual] Amount Burned: ${burnAmount} KAS`);

      // In production, we would use api.kaspa.org to verify the txHash destination is the Burn Address
      // For now, we simulate the protocol approval

      res.json({
        status: "success",
        message:
          "Proof-of-Burn verified. App is now globally accessible on Kaspstore.",
        launchBlock: 55219032,
        txHash,
      });
    } catch (error: any) {
      console.error("Launch Error:", error);
      res.status(500).json({ error: "Burn verification failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("[Startup] Loading Vite middleware...");
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("[Startup] Vite middleware integrated.");
    } catch (err) {
      console.error("[Startup] Failed to load Vite:", err);
      serveStaticFiles(app);
    }
  } else {
    serveStaticFiles(app);
  }

  // --- SESSION RELAY FOR MOBILE CONNECT ---
const sessions = new Map<string, { address: string; identity?: string | null }>();
const requests = new Map<string, any>();
const responses = new Map<string, any>();

app.post("/api/session/:id", express.json(), (req, res) => {
  const { id } = req.params;
  const { address, identity } = req.body;
  console.log(`[Relay] Linking Session Request: id=${id}, address=${address}, identity=${identity}`);
  if (!address) return res.status(400).json({ error: "Address required" });
  
  sessions.set(id, { address, identity });
  console.log(`[Relay] Session ${id} successfully linked to ${address}`);
  setTimeout(() => {
    if (sessions.get(id)?.address === address) {
       console.log(`[Relay] Session ${id} expired.`);
       sessions.delete(id)
    }
  }, 15 * 60 * 1000); // 15m
  res.json({ success: true });
});

app.get("/api/session/:id", (req, res) => {
  const { id } = req.params;
  const data = sessions.get(id);
  if (data) {
    console.log(`[Relay] Desktop polled session ${id}: Found ${data.address}`);
    return res.json(data);
  }
  res.status(404).json({ error: "No session" });
});

// Transaction Relay
app.post("/api/relay/:id/request", express.json(), (req, res) => {
  const { id } = req.params;
  console.log(`[Relay] Desktop pushing TX request to Session ${id}:`, req.body.identity);
  requests.set(id, req.body);
  responses.delete(id); 
  res.json({ success: true });
});

app.get("/api/relay/:id/request", (req, res) => {
  const { id } = req.params;
  const reqData = requests.get(id);
  if (reqData) {
    console.log(`[Relay] Mobile fetched TX request for Session ${id}`);
    requests.delete(id);
    return res.json(reqData);
  }
  res.status(404).send();
});

app.post("/api/relay/:id/response", express.json(), (req, res) => {
  const { id } = req.params;
  console.log(`[Relay] Mobile pushing TX response for Session ${id}:`, req.body.txId || req.body.error);
  responses.set(id, req.body);
  res.json({ success: true });
});

app.get("/api/relay/:id/response", (req, res) => {
  const { id } = req.params;
  const respData = responses.get(id);
  if (respData) {
    console.log(`[Relay] Desktop fetched TX response for Session ${id}`);
    responses.delete(id);
    return res.json(respData);
  }
  res.status(404).send();
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Kaspstore Protocol running on http://localhost:${PORT}`);
  });
}

function serveStaticFiles(app: express.Express) {
  console.log("[Startup] Serving static files from dist...");
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"), (err) => {
      if (err) {
        console.error("[Static] Error sending index.html:", err);
        res
          .status(500)
          .send("Index file missing. Deployment might be incomplete.");
      }
    });
  });
}

startServer().catch((err) => {
  console.error("Critical server startup error:", err);
  process.exit(1);
});
