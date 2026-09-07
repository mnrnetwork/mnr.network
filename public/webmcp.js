/**
 * mnr — WebMCP Tools Registration (W3C navigator.modelContext)
 * Exposes Monero RPC relay tools and documentation search to AI agents.
 */
(function registerWebMcp() {
  if (typeof navigator === "undefined" || !("modelContext" in navigator) || !navigator.modelContext) {
    return;
  }

  const mc = navigator.modelContext;

  // 1. Search Documentation Tool
  const searchDocsTool = {
    name: "search_documentation",
    description: "Search mnr documentation, wallet setup guides, Monero RPC verification rules, and architecture specs.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Keyword or topic to search for (e.g. 'feather', 'tokens', 'method policy', 'quorum')"
        }
      },
      required: ["query"]
    },
    execute: async ({ query }) => {
      try {
        const res = await fetch("/search-index.json");
        if (!res.ok) return { content: [{ type: "text", text: `Search index unavailable: HTTP ${res.status}` }] };
        const index = await res.json();
        const q = query.toLowerCase();
        const matches = index
          .filter(item => (item.title && item.title.toLowerCase().includes(q)) || (item.content && item.content.toLowerCase().includes(q)))
          .slice(0, 5)
          .map(item => `- [${item.title}](${item.url}): ${item.description || item.title}`);
        return {
          content: [
            {
              type: "text",
              text: matches.length ? `Found ${matches.length} matching documentation entries:\n${matches.join("\n")}` : `No documentation found for '${query}'.`
            }
          ]
        };
      } catch (err) {
        return { content: [{ type: "text", text: `Search error: ${err.message}` }] };
      }
    },
    annotations: { readOnlyHint: true }
  };

  // 2. Get Upstream Nodes Telemetry Tool
  const getUpstreamsTool = {
    name: "get_upstream_nodes",
    description: "Retrieve real-time telemetry, tip height, latency, and status for Monero daemon upstream nodes relayed by mnr.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of upstream nodes to return (default 5, max 20)"
        }
      }
    },
    execute: async ({ limit = 5 }) => {
      try {
        const res = await fetch("/upstreams/index.md");
        if (res.ok) {
          const text = await res.text();
          return { content: [{ type: "text", text: `Live Upstream Node Telemetry:\n${text.slice(0, 1500)}` }] };
        }
        return {
          content: [
            {
              type: "text",
              text: "Relay pool maintains 15+ geographically distributed public Monero nodes with strict quorum consensus."
            }
          ]
        };
      } catch (err) {
        return { content: [{ type: "text", text: `Telemetry query failed: ${err.message}` }] };
      }
    },
    annotations: { readOnlyHint: true }
  };

  // 3. Provision Anonymous Free Bearer Token Tool
  const provisionTokenTool = {
    name: "provision_free_token",
    description: "Generate an anonymous Free bearer token for mnr Monero RPC relay (500,000 monthly work units, 5 req/s). Zero KYC, zero personal data.",
    inputSchema: {
      type: "object",
      properties: {}
    },
    execute: async () => {
      try {
        const res = await fetch("https://rpc.mnr.network/v1/tokens/free", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" }
        });
        if (res.ok) {
          const data = await res.json();
          return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }
        return {
          content: [
            {
              type: "text",
              text: "To generate a free bearer token, issue: curl -X POST https://rpc.mnr.network/v1/tokens/free"
            }
          ]
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: "Token generation endpoint: POST https://rpc.mnr.network/v1/tokens/free (Zero-KYC, anonymous)"
            }
          ]
        };
      }
    }
  };

  // 4. Check RPC Method Policy Tool
  const methodPolicyTool = {
    name: "check_rpc_method_policy",
    description: "Check verification quorum policy, work unit cost, and cache rules for a Monero daemon RPC method.",
    inputSchema: {
      type: "object",
      properties: {
        method: {
          type: "string",
          description: "Monero RPC method name (e.g. 'get_info', 'get_height', 'send_raw_transaction', 'get_block_template')"
        }
      },
      required: ["method"]
    },
    execute: async ({ method }) => {
      const policies = {
        get_info: { policy: "Quorum verification (3 nodes)", cache: "SWR 10s", workUnits: 1 },
        get_height: { policy: "Consensus tip check", cache: "SWR 5s", workUnits: 1 },
        send_raw_transaction: { policy: "Multi-broadcast to all healthy upstreams", cache: "No cache", workUnits: 5 },
        get_block_template: { policy: "Disallowed on public proxy (mining method)", cache: "None", workUnits: 0 }
      };
      const info = policies[method.toLowerCase()] || {
        policy: "Routed through healthy node pool with response sanitization",
        cache: "Method default",
        workUnits: 1
      };
      return {
        content: [{ type: "text", text: `Method ${method}:\n${JSON.stringify(info, null, 2)}` }]
      };
    },
    annotations: { readOnlyHint: true }
  };

  try {
    mc.registerTool(searchDocsTool);
    mc.registerTool(getUpstreamsTool);
    mc.registerTool(provisionTokenTool);
    mc.registerTool(methodPolicyTool);
  } catch (e) {
    console.error("WebMCP registration error:", e);
  }
})();
