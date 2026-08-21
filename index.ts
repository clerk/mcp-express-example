import "dotenv/config";
import { clerkClient, clerkMiddleware } from "@clerk/express";
import {
  authServerMetadataHandlerClerk,
  mcpAuthClerk,
  protectedResourceHandlerClerk,
  streamableHttpHandler,
} from "@clerk/mcp-tools/express";
import {
  invalidOriginResponseBody,
  validateOrigin,
} from "@clerk/mcp-tools/server";
import { McpServer } from "@modelcontextprotocol/server";
import cors from "cors";
import express from "express";
import fs from "node:fs";
import https from "node:https";
import path from "node:path";

const app = express();

// Hostnames (no scheme, no port) of browser-based MCP clients allowed to call
// the /mcp endpoint, beyond the localhost-class defaults (localhost,
// 127.0.0.1, [::1]). The MCP spec requires servers to validate Origin to
// prevent DNS rebinding attacks, so don't use a blanket cors() here.
const allowedOrigins: string[] = [];

// OAuth discovery metadata is public by design, so it stays CORS-open
app.use("/.well-known", cors());

// The MCP endpoint only grants CORS to origins that pass the same allowlist
// the MCP handler itself enforces (it answers 403 to everything else).
// WWW-Authenticate must be exposed so browser-based clients can discover the
// authorization server from a 401 response.
app.use(
  "/mcp",
  cors({
    origin: (origin, callback) =>
      callback(null, validateOrigin({ originHeader: origin, allowedOrigins }).ok),
    exposedHeaders: ["WWW-Authenticate"],
  })
);

// Reject a disallowed Origin before token verification, mirroring the
// Next.js handler's order: a DNS-rebound request shouldn't cost a live
// Clerk token verification. The MCP handler validates Origin again as
// defense in depth.
app.use("/mcp", (req, res, next) => {
  const origin = validateOrigin({ originHeader: req.headers.origin, allowedOrigins });
  if (!origin.ok) {
    res.status(403).json(invalidOriginResponseBody(origin.message));
    return;
  }
  next();
});

app.use(clerkMiddleware());
app.use(express.json());

// Transports are per-request and stateless in MCP SDK v2, so the handler
// takes a factory that builds a fresh server for every request.
function createServer() {
  const server = new McpServer(
    {
      name: "test-server",
      version: "0.0.1",
    },
    {
      // The 2026-07-28 protocol revision requires ttlMs/cacheScope on list
      // results. Without hints the SDK stamps the conservative
      // { ttlMs: 0, cacheScope: 'private' } ("immediately stale"); this
      // server's tool list is static, so let clients cache it for a minute.
      cacheHints: { "tools/list": { ttlMs: 60_000, cacheScope: "private" } },
    }
  );

  server.registerTool(
    "get_clerk_user_data",
    { description: "Gets data about the Clerk user that authorized this request" },
    async (ctx) => {
      // mcpAuthClerk guarantees this is present; the check keeps the failure
      // clear at this line if that guarantee ever drifts
      const userId = ctx.http?.authInfo?.extra?.userId;
      if (typeof userId !== "string") {
        throw new Error("Missing authenticated userId on request");
      }
      const userData = await clerkClient.users.getUser(userId);

      return {
        content: [{ type: "text", text: JSON.stringify(userData) }],
      };
    }
  );

  return server;
}

// Note: OAuth tokens are machine tokens. Machine token usage is free
// during our public beta period but will be subject to pricing once
// generally available. Pricing is expected to be competitive and below
// market averages.
app.all(
  "/mcp",
  mcpAuthClerk,
  streamableHttpHandler(createServer, { allowedOrigins })
);

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
