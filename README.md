# Express & Clerk MCP Server Demo

The simplest, most bare bones implementation of an MCP server, using express. At the moment, it only exposes a streamable http handler. It could be adapted to handle SSE as well if necessary though. The purpose of this example is to serve as a proof of concept!

### Getting started

- Run `npm i` to install dependencies
- Run `cp .env.sample .env` and copy your Clerk API keys [from your dashboard](https://dashboard.clerk.com/last-active?path=api-keys) into the `.env` file
- Run `npm start` to start the server
- You should be able to connect to it now from any client that supports tha latest version of the MCP spec. A cursor configuration is provided as a test.

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
