import https from "https";
function check(url) {
  https.get(url, (res) => {
    console.log(url, res.statusCode);
  }).on("error", (e) => console.log(url, e.message));
}
check("https://api.kaspa.org/info/blockdag");
check("https://kaspa-api.kaspa.org/info/blockdag");
check("https://mainnet-api.kaspanet.io/info/blockdag");
check("https://mainnet.kaspa-api.io/info/blockdag");
