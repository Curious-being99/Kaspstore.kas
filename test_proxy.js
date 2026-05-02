
async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/network-info');
    console.log(await res.text());
  } catch (e) {
    console.log(e);
  }
}
test();
