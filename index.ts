import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

const server = new McpServer({
  name: "test-server",
  version: "0.0.1",
});

server.tool("say-hello", { name: z.string() }, async ({ name }) => ({
  content: [{ type: "text", text: `Hello ${name}!` }],
}));

const app = express();
let transport: SSEServerTransport;

// initialize connection and session
app.get("/mcp/register", async (_, res) => {
  transport = new SSEServerTransport("/mcp/message", res);
  await server.connect(transport);
  console.log("connected");
});

app.post("/mcp/message", async (req, res) => {
  await transport.handlePostMessage(req, res);
});

app.listen(3000);
