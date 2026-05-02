async function testFetch() {
  const gateways = [
    "https://api.kaspa.org",
    "https://kaspa-api.kaspa.org",
    "https://mainnet-api.kaspanet.io",
    "https://mainnet.kaspa-api.io",
  ];

  for (const gateway of gateways) {
    try {
      const headers = {
        "User-Agent": "Kaspstore.kas/1.1",
        Accept: "application/json",
      };

      const res = await fetch(gateway + '/info/blockdag', { headers });
      console.log(`[${gateway}] Status: ${res.status}`);
      if (res.ok) {
         console.log(await res.text());
      }
    } catch (e) {
      console.log(`[${gateway}] Error: ${e.message}`);
    }
  }
}

testFetch();
