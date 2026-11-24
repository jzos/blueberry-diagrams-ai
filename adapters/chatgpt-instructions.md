ChatGPT integration
===================

ChatGPT web cannot execute an arbitrary local `blueberry mcp` stdio process. A custom
MCP app uses a remotely reachable secure HTTPS Streamable HTTP endpoint.

1. Self-host `blueberry serve --host 0.0.0.0 --port 3847` with BLUEBERRY_TOKEN,
   behind TLS, authentication and rate limiting (reverse proxy or managed host).
2. Publish the secure endpoint such as https://diagrams.example.com/mcp.
3. In supported ChatGPT accounts/workspaces, create a custom MCP app pointing
   to that endpoint, following current ChatGPT Apps / Developer Mode docs.
4. Verify access policy, endpoint authorization, and user privacy before sharing.

The local browser wizard remains available in any browser by running `blueberry`.
No native ChatGPT embedded form is claimed. A dedicated MCP Apps UI extension is
future work and may require review/approval and a host-specific UI bridge.

Docs: https://developers.openai.com/plugins/build/app-quickstart
