import "dotenv/config";
import { clerkClient, clerkMiddleware } from "@clerk/express";
import {
  mcpAuthClerk,
  protectedResourceHandlerClerk,
  streamableHttpHandler,
  authServerMetadataHandlerClerk,
} from "@clerk/mcp-tools/express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import cors from "cors";
import express from "express";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";

const app = express();
app.use(cors({ exposedHeaders: ["WWW-Authenticate"] }));
app.use(clerkMiddleware());
app.use(express.json());

const server = new McpServer({
  name: "test-server",
  version: "0.0.1",
});

server.tool(
  "get_clerk_user_data",
  "Gets data about the Clerk user that authorized this request",
  {},
  async (_, { authInfo }) => {
    // non-null assertion is safe here, mcpAuthClerk ensures presence
    const userId = authInfo!.extra!.userId! as string;
    const userData = await clerkClient.users.getUser(userId);

    return {
      content: [{ type: "text", text: JSON.stringify(userData) }],
    };
  }
);

// Note: OAuth tokens are machine tokens. Machine token usage is free
// during our public beta period but will be subject to pricing once
// generally available. Pricing is expected to be competitive and below
// market averages.
app.post("/mcp", mcpAuthClerk, streamableHttpHandler(server));

// handle oauth metadata requests
app.get(
  "/.well-known/oauth-protected-resource/mcp",
  protectedResourceHandlerClerk({ scopes_supported: ["email", "profile"] })
);

app.get(
  "/.well-known/oauth-authorization-server",
  authServerMetadataHandlerClerk
);

app.use((req, res) => {
  console.log("ANY request received:", req.url);
  res.json({ message: "Hello from server" });
});

// Start HTTP server
app.listen(3000, () => {
  console.log("HTTP server running at http://localhost:3000");
});

// HTTPS Server handling - required for testing w/ claude 😞
const certPath = path.join(process.cwd(), "cert", "localhost+2.pem");
const keyPath = path.join(process.cwd(), "cert", "localhost+2-key.pem");

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  const sslOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };

  https.createServer(sslOptions, app).listen(3001, () => {
    console.log("HTTPS server running at https://localhost:3001");
  });
}
