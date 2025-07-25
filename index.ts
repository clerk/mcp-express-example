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

const app = express();
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
    // non-null assertion is safe here, authHandler ensures presence
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
  cors(),
  protectedResourceHandlerClerk
);

app.get(
  "/.well-known/oauth-authorization-server",
  cors(),
  authServerMetadataHandlerClerk
);

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
