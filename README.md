# Express & Clerk MCP Server Demo

The simplest, most bare bones implementation of an MCP server, using express. At the moment, it only exposes a streamable http handler. It could be adapted to handle SSE as well if necessary though. The purpose of this example is to serve as a proof of concept!

### Getting started

- Run `npm i` to install dependencies
- Run `cp .env.sample .env` and copy your Clerk API keys [from your dashboard](https://dashboard.clerk.com/last-active?path=api-keys) into the `.env` file
- Run `npm start` to start the server
- You should be able to connect to it now from any client that supports tha latest version of the MCP spec. A cursor configuration is provided as a test.
