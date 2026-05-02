const fetch = globalThis.fetch || require("node-fetch");
async function check(url, noUA) {
  try {
    const headers = noUA ? {} : { "User-Agent": "PostmanRuntime/7.28.4" };
    const res = await fetch(url + "/info/blockdag", { headers, signal: AbortSignal.timeout(2000) });
    console.log(url, res.status);
  } catch(e) {
    console.log(url, e.name);
  }
}
async function main() {
  await check("https://api.kaspa.org", true);
  await check("https://kaspa.app", false);
  await check("https://api.kaspa.org", false);
}
main();
