# Express & Clerk MCP Server Demo

The simplest, most bare bones implementation of an MCP server, using express. It exposes a streamable http handler built on the MCP SDK v2 packages (`@modelcontextprotocol/server`), targeting MCP protocol revision 2026-07-28. Servers built this way also answer the legacy `initialize` handshake, so older MCP clients keep working. The purpose of this example is to serve as a proof of concept!

### Getting started

- Run `pnpm i` to install dependencies
- Run `cp .env.sample .env` and copy your Clerk API keys [from your dashboard](https://dashboard.clerk.com/last-active?path=api-keys) into the `.env` file
- Run `pnpm start` to start the server
- You should be able to connect to it now from any client that supports the latest version of the MCP spec. A cursor configuration is provided as a test.

### Origin validation

The MCP spec requires servers to validate the `Origin` header to prevent DNS rebinding attacks, so this example does not use a blanket permissive `cors()`. Requests to `/mcp` that carry an `Origin` header are rejected with a 403 unless the origin's hostname is localhost-class (`localhost`, `127.0.0.1`, `[::1]`) or listed in the `allowedOrigins` array in `index.ts` — add your web client's hostname there if you're connecting from a browser-based MCP client. Non-browser clients (Cursor, Claude, etc.) don't send an `Origin` header and are unaffected. The CORS allowlist for `/mcp` is derived from the same array, while the OAuth discovery metadata under `/.well-known` stays CORS-open — those documents are public by design.

### HTTPS Setup (Optional)

By default, the server runs on HTTP only. To enable HTTPS for development (useful for testing with some clients), you'll need to generate locally trusted certificates:

1. **Install mkcert** (if not already installed):

   ```bash
   # macOS
   brew install mkcert

   # Windows (using Chocolatey)
   choco install mkcert

   # Linux
   # See https://github.com/FiloSottile/mkcert#installation
   ```

2. **Setup local certificate authority**:

   ```bash
   mkcert -install
   ```

3. **Generate certificates**:

   ```bash
   mkcert localhost 127.0.0.1 ::1
   mkdir -p cert
   mv localhost+2*.pem cert/
   ```

4. **Restart the server** - it will automatically detect the certificates and start both HTTP (port 3000) and HTTPS (port 3001) servers.

The certificates are gitignored, so each developer needs to generate their own locally trusted certificates.
