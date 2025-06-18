import "dotenv/config";
import {
  type MachineAuthObject,
  clerkClient,
  clerkMiddleware,
} from "@clerk/express";
import {
  mcpAuthClerk,
  protectedResourceHandlerClerk,
  streamableHttpHandler,
} from "@clerk/mcp-tools/express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
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
    const clerkAuthInfo =
      authInfo as unknown as MachineAuthObject<"oauth_token">;
    if (!clerkAuthInfo?.userId) {
      console.error(authInfo);
      return {
        content: [{ type: "text", text: "Error: user not authenticated" }],
      };
    }
    const user = await clerkClient.users.getUser(clerkAuthInfo.userId);
    return {
      content: [{ type: "text", text: JSON.stringify(user) }],
    };
  }
);

app.post("/mcp", mcpAuthClerk, streamableHttpHandler(server));
app.get("/.well-known/oauth-protected-resource", protectedResourceHandlerClerk);

app.listen(3000);
