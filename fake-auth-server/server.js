// Minimal fake OAuth-style token endpoint shared by the iOS and Android contract runners.
// POST /__scenario  {responses:[{status,body}]}  -> resets state and queues scripted responses
// POST /oauth/token (form-encoded)               -> returns next scripted response (optionally after delayMs), records request
// GET  /__requests                               -> recorded token requests
const http = require("http");

let queue = [];
let requests = [];

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
  });
}

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/__scenario") {
    const { responses } = JSON.parse(await readBody(req));
    queue = [...responses];
    requests = [];
    return send(res, 200, { ok: true });
  }
  if (req.method === "GET" && req.url === "/__requests") {
    return send(res, 200, requests);
  }
  if (req.method === "POST" && req.url === "/oauth/token") {
    requests.push(Object.fromEntries(new URLSearchParams(await readBody(req))));
    const next = queue.shift();
    if (!next) return send(res, 500, { error: "no scripted response left" });
    if (next.delayMs) await new Promise((r) => setTimeout(r, next.delayMs));
    if (res.destroyed) return;
    return send(res, next.status, next.body);
  }
  send(res, 404, { error: "not found" });
});

const port = Number(process.env.PORT || 8089);
server.listen(port, "127.0.0.1", () => console.log(`fake-auth-server listening on ${port}`));
