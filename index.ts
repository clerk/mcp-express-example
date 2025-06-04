import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const server = new McpServer({
  name: "test-server",
  version: "0.0.1",
});

server.tool(
  "roll_dice",
  "Rolls an N-sided die",
  { sides: z.number().int().min(2) },
  async ({ sides }) => {
    const value = 1 + Math.floor(Math.random() * sides);
    return {
      content: [{ type: "text", text: `🎲 You rolled a ${value}!` }],
    };
  }
);

const app = express();

// SSE requires two separate endpoints that a single transport needs to
// be shared between. For this simple demo implementation, we store the
// transport in memory, but in production, relying on in-memory storage is not
// recommended.
let sseTransport: SSEServerTransport;

// SSE transport handling
app.get("/sse", async (_, res) => {
  sseTransport = new SSEServerTransport("/sse/message", res);
  await server.connect(sseTransport);
  console.log("connected");
});

app.post("/sse/message", async (req, res) => {
  await sseTransport.handlePostMessage(req, res);
});

// Streamable HTTP transport handling
app.post("/mcp", express.json(), async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);

  await transport.handleRequest(req, res, req.body);
});

app.listen(3000);
