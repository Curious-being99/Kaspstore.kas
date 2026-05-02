const fetch = globalThis.fetch || require("node-fetch");
async function check(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000), headers: { "User-Agent": "Mozilla/5.0" } });
    console.log(url, res.status);
  } catch(e) {
    console.log(url, e.name);
  }
}
async function main() {
  await check("https://api.kaspa.org/info/blockdag");
  await check("https://kaspa-api.kaspa.org/info/blockdag");
}
main();
