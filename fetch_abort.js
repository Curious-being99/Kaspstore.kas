async function testFetch() {
  const gateways = [
    "https://api.kaspa.org",
  ];

  for (const gateway of gateways) {
    try {
      const headers = {
        "User-Agent": "Kaspstore.kas/1.1",
        Accept: "application/json",
      };
      const subController = new AbortController();
      const subTimeoutId = setTimeout(() => subController.abort(), 15000);
      const res = await fetch(gateway + '/info/blockdag', { headers, signal: subController.signal });
      clearTimeout(subTimeoutId);
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