import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

const server = new McpServer({
  name: "test-server",
  version: "0.0.1",
});

server.tool("say-hello",
  { name: z.string() },
  async ({ name }) => ({
    content: [{ type: "text", text: `Hello ${name}!` }]
  })
);

const app = express();
const transports = {};

// initialize connection and session
app.get("/mcp/register", async (_, res) => {
  const transport = new SSEServerTransport('/mcp/message', res);
  transports[transport.sessionId] = transport;
  res.on("close", () => {
    delete transports[transport.sessionId];
  });
  await server.connect(transport);
  console.log("connected")
});

app.post("/mcp/message", async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports[sessionId];
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send('No transport found for sessionId');
  }
});

app.listen(3000);