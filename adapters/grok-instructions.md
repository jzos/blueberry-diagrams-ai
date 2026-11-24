Grok integration
================

Use xAI's custom MCP connector or remote MCP tools feature when supported.
The MCP endpoint must be a reachable HTTPS URL, not localhost on your laptop.

1. Host Blueberry and protect it with appropriate access controls.
2. Configure the published /mcp endpoint in the Grok custom connector or API.
3. Check the current xAI connector authentication options. This sample server
   supports static Bearer tokens but does NOT provide an OAuth2 authorization server.
   If your Grok host requires OAuth, deploy a compatible OAuth gateway first.
4. Alternatively, use the web wizard and copy the generated prompt into Grok.

Docs: https://docs.x.ai/grok/connectors
