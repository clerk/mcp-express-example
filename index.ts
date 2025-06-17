import "dotenv/config";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { generateClerkProtectedResourceMetadata } from "@clerk/mcp-tools/server";
import {
  createClerkClient,
  getAuth,
  MachineAuthObject,
  clerkMiddleware,
} from "@clerk/express";

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
    const user = await clerk.users.getUser(clerkAuthInfo.userId);
    return {
      content: [{ type: "text", text: JSON.stringify(user) }],
    };
  }
);

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

async function verifyToken(_, req: express.Request) {
  const authData = await getAuth(req, { acceptsToken: "oauth_token" });
  return authData.isAuthenticated ? authData : false;
}

// move to tools lib
async function mcpAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const origin = `${req.protocol}://${req.get("host")}${req.originalUrl}`;

  if (!req.headers["authorization"]) {
    return res
      .status(401)
      .set({
        "WWW-Authenticate": `Bearer resource_metadata=${origin}/.well-known/oauth-protected-resource`,
      })
      .send();
  } else {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.split(" ")[1];

    if (!token) {
      throw new Error(
        `Invalid authorization header value, expected Bearer <token>, received ${authHeader}`
      );
    }

    const authData = await verifyToken(token, req);

    if (!authData) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.auth = {
      userId: authData.userId,
    };
  }

  next();
}

app.post(
  "/mcp",
  mcpAuth,
  async (req: express.Request, res: express.Response) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await server.connect(transport);

    await transport.handleRequest(req, res, req.body);
  }
);

// make handler in tools lib
app.get("/.well-known/oauth-protected-resource", async (_, res) => {
  const metadata = await generateClerkProtectedResourceMetadata({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY!,
    resourceUrl: "http://localhost:3000",
  });

  res.json(metadata);
});

app.listen(3000);
