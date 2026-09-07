interface Env {
  ASSETS: {
    fetch: (request: Request | string, init?: RequestInit) => Promise<Response>;
  };
}

const LINK_HEADERS =
  '</.well-known/api-catalog>; rel="api-catalog", </openapi.json>; rel="service-desc", </docs/method-policy/>; rel="service-doc", </llms.txt>; rel="describedby", </.well-known/oauth-protected-resource>; rel="oauth-protected-resource"';

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, HEAD, OPTIONS",
  "access-control-allow-headers": "*",
};

const SWR_CACHE_HEADERS = {
  ...CORS_HEADERS,
  "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
  "x-content-type-options": "nosniff",
};

const FALLBACK_API_CATALOG = JSON.stringify(
  {
    linkset: [
      {
        anchor: "https://rpc.mnr.network/v1",
        "service-desc": [
          {
            href: "https://mnr.network/openapi.json",
            type: "application/vnd.oai.openapi+json",
            title: "mnr (Monero Network Relay) Monero RPC Gateway OpenAPI 3.1 Specification",
          },
        ],
        "service-doc": [
          {
            href: "https://mnr.network/docs/method-policy/",
            type: "text/html",
            title: "Monero RPC Method Policy & Verification Documentation",
          },
          {
            href: "https://mnr.network/docs/how-it-works/",
            type: "text/html",
            title: "How mnr Works: Architecture & Quorum Consensus",
          },
        ],
        status: [
          {
            href: "https://mnr.network/upstreams/",
            type: "text/html",
            title: "Monero Node Pool & Live Status Telemetry",
          },
          {
            href: "https://mnr.network/verified/",
            type: "text/html",
            title: "Independent Multi-Node Verification & Transparency Log",
          },
        ],
      },
      {
        anchor: "https://rpc.mnr.network/v1/tokens",
        "service-desc": [
          {
            href: "https://mnr.network/openapi.json",
            type: "application/vnd.oai.openapi+json",
            title: "mnr (Monero Network Relay) Token Provisioning API Specification",
          },
        ],
        "service-doc": [
          {
            href: "https://mnr.network/docs/tokens/",
            type: "text/html",
            title: "Tokens and Billing Documentation",
          },
        ],
        status: [
          {
            href: "https://mnr.network/get-token/",
            type: "text/html",
            title: "Token Issuance & Pricing Status",
          },
        ],
      },
    ],
  },
  null,
  2
);

const FALLBACK_OAUTH_PROTECTED_RESOURCE = JSON.stringify(
  {
    resource: "https://mnr.network",
    authorization_servers: ["https://mnr.network"],
    scopes_supported: ["rpc:read", "rpc:write", "wallet:sync"],
    bearer_methods_supported: ["header"],
    resource_documentation: "https://mnr.network/docs/method-policy/",
  },
  null,
  2
);

const FALLBACK_OAUTH_AUTH_SERVER = JSON.stringify(
  {
    issuer: "https://mnr.network",
    authorization_endpoint: "https://mnr.network/get-token/",
    token_endpoint: "https://rpc.mnr.network/v1/tokens/free",
    jwks_uri: "https://mnr.network/.well-known/jwks.json",
    response_types_supported: ["token"],
    grant_types_supported: ["client_credentials", "anonymous"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["rpc:read", "rpc:write", "wallet:sync"],
    service_documentation: "https://mnr.network/docs/tokens/",
    agent_auth: {
      skill: "https://mnr.network/auth.md",
      register_uri: "https://rpc.mnr.network/v1/tokens/free",
      identity_types_supported: ["anonymous"],
      anonymous: {
        credential_types_supported: ["bearer_token"],
        claim_uri: "https://mnr.network/get-token/",
      },
    },
  },
  null,
  2
);

const FALLBACK_ACP = JSON.stringify(
  {
    protocol: {
      name: "acp",
      version: "2025-01",
    },
    api_base_url: "https://rpc.mnr.network",
    transports: ["http", "json-rpc"],
    capabilities: {
      services: ["token_provisioning", "rpc_relay", "membership"],
    },
    endpoints: {
      tokens: "https://rpc.mnr.network/v1/tokens/free",
      catalog: "https://mnr.network/.well-known/api-catalog",
      pricing: "https://mnr.network/get-token/",
    },
    merchant: {
      name: "mnr (Monero Network Relay)",
      url: "https://mnr.network",
      description: "Verified Monero RPC Proxy Network & Token Provisioning",
    },
  },
  null,
  2
);

const FALLBACK_AUTH_MD = `# auth.md — Agent Registration & Authentication for mnr (Monero Network Relay)

Welcome to the **mnr (Monero Network Relay)** verified Monero RPC network (\`mnr.network\`). This document specifies authentication, registration, and discovery protocols for autonomous AI agents, LLMs, and client software.

> [!NOTE]
> **Entity Disambiguation**: **mnr** refers specifically to the **Monero Network Relay** (\`mnr.network\`, RPC: \`rpc.mnr.network\`). It is an open-source, trust-minimized, anti-KYC RPC proxy network for Monero (XMR). It is completely unrelated to MTA Metro-North Railroad (MNR), the Ontario Ministry of Natural Resources (MNR / MNRF), or the \`mnr\` npm package.

## Agent Audience

This service is designed for:
- Autonomous AI agents performing on-chain analysis and private Monero transactions.
- Automated payment bots, trading routines, and relay aggregators.
- Non-custodial Monero wallets (CLI, GUI, Feather, Cake Wallet, Monerujo, RipleyOS).

mnr enforces a strict **Zero-KYC, Zero-Account** architecture: a cryptographic bearer token constitutes the entire relationship.

---

## Autonomous Agent Provisioning

Agents do not require human interaction, email verification, or credit cards to authenticate.

### 1. Instant Free Token Provisioning

Agents can register anonymously via a simple HTTP POST request:

- **Endpoint**: \`POST https://rpc.mnr.network/v1/tokens/free\`
- **Method**: \`POST\`
- **Headers**:
  - \`Content-Type: application/json\`
  - \`Accept: application/json\`
- **Body**: \`{}\` (empty object or omitted)

#### Response (\`200 OK\`)
\`\`\`json
{
  "token": "4f8a12d9c0e3b5678912345678abcdef",
  "tier": "free",
  "work_units_monthly": 500000,
  "burst_per_sec": 5,
  "sync_streams": 1,
  "endpoints": {
    "clearnet": "https://rpc.mnr.network/v1/4f8a12d9c0e3b5678912345678abcdef/json_rpc",
    "tor": "http://mnrrpcvbopaykx7um32r4iyamontteidypjd33fhzvuy2hwfu5c4ifad.onion/v1/4f8a12d9c0e3b5678912345678abcdef/json_rpc"
  }
}
\`\`\`

### 2. Token Rotation

If an agent suspects key exposure or requires rotation:

- **Endpoint**: \`POST https://rpc.mnr.network/v1/{current_token}/rotate\`
- **Headers**:
  - \`Authorization: Bearer {current_token}\`
- **Response**: Returns a freshly generated replacement bearer token; the old token is invalidated immediately.

---

## Credential Usage

mnr accepts authentication in two standard formats:

### Header Authentication (RFC 6750)
\`\`\`http
POST /v1/{token}/json_rpc HTTP/1.1
Host: rpc.mnr.network
Authorization: Bearer <your-bearer-token>
Content-Type: application/json

{"jsonrpc":"2.0","id":"0","method":"get_info"}
\`\`\`

### Path-Scoped Proxy Authentication
For Monero wallets and CLI tools that lack custom header configuration:
\`\`\`
https://rpc.mnr.network/v1/<your-bearer-token>/json_rpc
\`\`\`

---

## Machine Discovery Metadata

Agents can programmatically discover network capabilities and authorization endpoints:

- **OAuth Protected Resource Metadata (RFC 9728)**: https://mnr.network/.well-known/oauth-protected-resource
- **OAuth 2.0 Authorization Server Metadata (RFC 8414)**: https://mnr.network/.well-known/oauth-authorization-server
- **OpenID Connect Discovery (OIDC)**: https://mnr.network/.well-known/openid-configuration
- **RFC 9727 API Catalog**: https://mnr.network/.well-known/api-catalog
- **OpenAPI 3.1 Specification**: https://mnr.network/openapi.json
- **Agentic Commerce Protocol (ACP)**: https://mnr.network/.well-known/acp.json
- **Independent Verification & Transparency Log**: https://mnr.network/verified/
- **Agent Context**: https://mnr.network/llms.txt
- **Package Registries**: [crates.io/crates/mnr](https://crates.io/crates/mnr), [pypi.org/project/mnr/](https://pypi.org/project/mnr/), [npmjs.com/package/mnr-network](https://www.npmjs.com/package/mnr-network)

---

## Flow & Identity Types

- **Supported Identity Types**: \`["anonymous"]\`
- **Supported Credential Types**: \`["bearer_token"]\`
- **Claim URI**: \`https://mnr.network/get-token/\`
- **Registration URI**: \`https://rpc.mnr.network/v1/tokens/free\`
`;

const FALLBACK_UPSTREAMS_JSON = JSON.stringify({
  degraded: false,
  faults: [],
  opt_outs: [],
  quorum_agreeing: 15,
  quorum_hash: "3dfd8d2c455082710ae8ab2ba5f8f0a98e82be106882390ff19d59884e86f61d",
  quorum_height: 3757137,
  relay: {
    commit: "0d679add7b7a",
    self_reported: true,
    started_at: 1788750636,
    target: "x86_64-unknown-linux-gnu",
    version: "0.1.17"
  },
  upstreams: [
    { caps: { max_streams: 32, mbps: 200, rps_light: 500 }, ejected: false, faults: 1, height: 3757137, kind: "owned", last_error: null, name: "own-1", ok: true, on_tip: true, opted_out: false, probes_24h: 1255, probes_total: 6940, rate_15m: 0.54, requests: 37524, restricted: true, rtt_ms: 663, stream_bytes: 17082551111, synchronized: true, transport: "http", up_24h: 0.994, up_total: 0.98, verified: 4412, wu: 372235 },
    { caps: { max_streams: 2, mbps: 10, rps_light: 5 }, ejected: false, faults: 0, height: 3757137, kind: "public", last_error: null, name: "cakewallet", ok: true, on_tip: true, opted_out: false, probes_24h: 1255, probes_total: 6940, rate_15m: 0.38, requests: 21070, restricted: true, rtt_ms: 57, stream_bytes: 33160898, synchronized: true, transport: "https", up_24h: 0.988, up_total: 0.957, verified: 11337, wu: 14793 },
    { caps: { max_streams: 2, mbps: 10, rps_light: 5 }, ejected: false, faults: 0, height: 3757137, kind: "public", last_error: null, name: "sethforprivacy", ok: true, on_tip: true, opted_out: false, probes_24h: 1255, probes_total: 6940, rate_15m: 0.05, requests: 19566, restricted: true, rtt_ms: 150, stream_bytes: 197557, synchronized: true, transport: "http", up_24h: 0.986, up_total: 0.573, verified: 10342, wu: 12629 },
    { caps: { max_streams: 2, mbps: 10, rps_light: 5 }, ejected: false, faults: 0, height: 3757137, kind: "public", last_error: null, name: "monerodevs-3", ok: true, on_tip: true, opted_out: false, probes_24h: 1255, probes_total: 3707, rate_15m: 0.0, requests: 3733, restricted: true, rtt_ms: 166, stream_bytes: 0, synchronized: true, transport: "http", up_24h: 0.999, up_total: 0.998, verified: 19, wu: 26 },
    { caps: { max_streams: 2, mbps: 10, rps_light: 5 }, ejected: false, faults: 0, height: 3757137, kind: "public", last_error: null, name: "hashvault", ok: true, on_tip: true, opted_out: false, probes_24h: 1255, probes_total: 6940, rate_15m: 0.0, requests: 9672, restricted: true, rtt_ms: 208, stream_bytes: 0, synchronized: true, transport: "http", up_24h: 0.999, up_total: 0.997, verified: 850, wu: 2732 },
    { caps: { max_streams: 2, mbps: 10, rps_light: 5 }, ejected: false, faults: 0, height: 3757137, kind: "public", last_error: null, name: "boldsuck-de", ok: true, on_tip: true, opted_out: false, probes_24h: 1255, probes_total: 6940, rate_15m: 0.0, requests: 10014, restricted: true, rtt_ms: 162, stream_bytes: 0, synchronized: true, transport: "http", up_24h: 1.0, up_total: 0.999, verified: 993, wu: 3074 },
    { caps: { max_streams: 2, mbps: 10, rps_light: 5 }, ejected: false, faults: 0, height: 3757137, kind: "public", last_error: null, name: "boldsuck-berlin", ok: true, on_tip: true, opted_out: false, probes_24h: 1255, probes_total: 6940, rate_15m: 0.0, requests: 9299, restricted: true, rtt_ms: 169, stream_bytes: 0, synchronized: true, transport: "http", up_24h: 0.998, up_total: 0.997, verified: 528, wu: 2359 },
    { caps: { max_streams: 2, mbps: 10, rps_light: 5 }, ejected: false, faults: 0, height: 3757137, kind: "public", last_error: null, name: "cryptostorm", ok: true, on_tip: true, opted_out: false, probes_24h: 1255, probes_total: 6940, rate_15m: 0.0, requests: 10640, restricted: true, rtt_ms: 575, stream_bytes: 0, synchronized: true, transport: "https", up_24h: 0.617, up_total: 0.58, verified: 1483, wu: 3700 },
    { caps: { max_streams: 2, mbps: 10, rps_light: 5 }, ejected: false, faults: 0, height: 3757137, kind: "public", last_error: null, name: "privacyx", ok: true, on_tip: true, opted_out: false, probes_24h: 1255, probes_total: 6940, rate_15m: 0.0, requests: 11475, restricted: true, rtt_ms: 184, stream_bytes: 0, synchronized: true, transport: "https", up_24h: 0.997, up_total: 0.997, verified: 1765, wu: 4535 },
    { caps: { max_streams: 2, mbps: 10, rps_light: 5 }, ejected: false, faults: 0, height: 3757137, kind: "public", last_error: null, name: "stormycloud", ok: true, on_tip: true, opted_out: false, probes_24h: 1255, probes_total: 6940, rate_15m: 0.0, requests: 10575, restricted: true, rtt_ms: 1110, stream_bytes: 61744, synchronized: true, transport: "http", up_24h: 0.857, up_total: 0.875, verified: 1571, wu: 3636 },
    { caps: { max_streams: 2, mbps: 10, rps_light: 5 }, ejected: false, faults: 0, height: 3757137, kind: "public", last_error: null, name: "xmr-tw-1", ok: true, on_tip: true, opted_out: false, probes_24h: 1255, probes_total: 6940, rate_15m: 0.004, requests: 14042, restricted: true, rtt_ms: 148, stream_bytes: 0, synchronized: true, transport: "http", up_24h: 0.998, up_total: 0.995, verified: 4677, wu: 7102 },
    { caps: { max_streams: 2, mbps: 10, rps_light: 5 }, ejected: false, faults: 0, height: 3757137, kind: "public", last_error: null, name: "monerodevs-2", ok: true, on_tip: true, opted_out: false, probes_24h: 1255, probes_total: 6940, rate_15m: 0.0, requests: 10890, restricted: true, rtt_ms: 183, stream_bytes: 11190269, synchronized: true, transport: "http", up_24h: 0.994, up_total: 0.998, verified: 1903, wu: 4173 },
    { caps: { max_streams: 2, mbps: 10, rps_light: 5 }, ejected: false, faults: 0, height: 3757137, kind: "public", last_error: null, name: "monerujo", ok: true, on_tip: true, opted_out: false, probes_24h: 1255, probes_total: 6940, rate_15m: 0.0, requests: 10481, restricted: true, rtt_ms: 330, stream_bytes: 0, synchronized: true, transport: "http", up_24h: 0.994, up_total: 0.98, verified: 1557, wu: 3541 },
    { caps: { max_streams: 2, mbps: 10, rps_light: 5 }, ejected: false, faults: 1, height: 3757137, kind: "public", last_error: null, name: "stackwallet", ok: true, on_tip: true, opted_out: false, probes_24h: 1255, probes_total: 6940, rate_15m: 0.42, requests: 32989, restricted: true, rtt_ms: 65, stream_bytes: 105710105, synchronized: true, transport: "http", up_24h: 0.999, up_total: 0.999, verified: 22844, wu: 28163 },
    { caps: { max_streams: 2, mbps: 10, rps_light: 5 }, ejected: false, faults: 1, height: 3757137, kind: "public", last_error: null, name: "xmr-support", ok: true, on_tip: true, opted_out: false, probes_24h: 1255, probes_total: 6940, rate_15m: 0.44, requests: 28593, restricted: true, rtt_ms: 35, stream_bytes: 288514598, synchronized: true, transport: "http", up_24h: 0.997, up_total: 0.996, verified: 17696, wu: 27423 }
  ]
});

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const accept = request.headers.get("accept") || "";

    // Handle OPTIONS for discovery endpoints
    if (request.method === "OPTIONS") {
      const isDiscovery =
        url.pathname.startsWith("/.well-known/") ||
        url.pathname === "/openapi.json" ||
        url.pathname === "/auth.md" ||
        url.pathname === "/upstreams.json";
      if (isDiscovery) {
        return new Response(null, {
          status: 204,
          headers: {
            ...CORS_HEADERS,
            "access-control-max-age": "86400",
          },
        });
      }
    }

    // 1. RFC 9727: API Catalog discovery
    if (url.pathname === "/.well-known/api-catalog" || url.pathname === "/.well-known/api-catalog/") {
      let catalogText = "";
      try {
        const catalogRes = await env.ASSETS.fetch(
          new Request(new URL("/.well-known/api-catalog", request.url).toString(), {
            method: "GET",
            headers: request.headers,
          })
        );
        if (catalogRes.ok) {
          catalogText = await catalogRes.text();
        }
      } catch {}

      if (!catalogText.trim()) {
        catalogText = FALLBACK_API_CATALOG;
      }

      const headers = new Headers({
        ...SWR_CACHE_HEADERS,
        "content-type": "application/linkset+json",
      });
      if (request.method === "HEAD") {
        return new Response(null, { status: 200, headers });
      }
      return new Response(catalogText, { status: 200, headers });
    }

    // 2. OpenAPI Specification
    if (url.pathname === "/openapi.json" || url.pathname === "/openapi.json/") {
      let specText = "";
      try {
        const specRes = await env.ASSETS.fetch(
          new Request(new URL("/openapi.json", request.url).toString(), {
            method: "GET",
            headers: request.headers,
          })
        );
        if (specRes.ok) {
          specText = await specRes.text();
        }
      } catch {}

      const headers = new Headers({
        ...SWR_CACHE_HEADERS,
        "content-type": "application/vnd.oai.openapi+json; charset=utf-8",
      });
      if (request.method === "HEAD") {
        return new Response(null, { status: 200, headers });
      }
      return new Response(specText, { status: 200, headers });
    }

    // 3. OAuth Protected Resource Metadata (RFC 9728)
    if (
      url.pathname === "/.well-known/oauth-protected-resource" ||
      url.pathname === "/.well-known/oauth-protected-resource/"
    ) {
      let text = "";
      try {
        const res = await env.ASSETS.fetch(
          new Request(new URL("/.well-known/oauth-protected-resource", request.url).toString(), {
            method: "GET",
            headers: request.headers,
          })
        );
        if (res.ok) text = await res.text();
      } catch {}
      if (!text.trim()) text = FALLBACK_OAUTH_PROTECTED_RESOURCE;
      try {
        const data = JSON.parse(text);
        data.resource = url.searchParams.get("resource") || "https://mnr.network";
        text = JSON.stringify(data, null, 2);
      } catch {}

      const headers = new Headers({
        ...SWR_CACHE_HEADERS,
        "content-type": "application/json; charset=utf-8",
      });
      if (request.method === "HEAD") return new Response(null, { status: 200, headers });
      return new Response(text, { status: 200, headers });
    }

    // 4. OAuth Authorization Server & OpenID Configuration (RFC 8414 / OIDC)
    if (
      url.pathname === "/.well-known/oauth-authorization-server" ||
      url.pathname === "/.well-known/oauth-authorization-server/" ||
      url.pathname === "/.well-known/openid-configuration" ||
      url.pathname === "/.well-known/openid-configuration/"
    ) {
      let text = "";
      try {
        const res = await env.ASSETS.fetch(
          new Request(new URL("/.well-known/oauth-authorization-server", request.url).toString(), {
            method: "GET",
            headers: request.headers,
          })
        );
        if (res.ok) text = await res.text();
      } catch {}
      if (!text.trim()) text = FALLBACK_OAUTH_AUTH_SERVER;

      const headers = new Headers({
        ...SWR_CACHE_HEADERS,
        "content-type": "application/json; charset=utf-8",
      });
      if (request.method === "HEAD") return new Response(null, { status: 200, headers });
      return new Response(text, { status: 200, headers });
    }

    // 5. JWKS Endpoint
    if (url.pathname === "/.well-known/jwks.json" || url.pathname === "/.well-known/jwks.json/") {
      const headers = new Headers({
        ...SWR_CACHE_HEADERS,
        "content-type": "application/json; charset=utf-8",
      });
      if (request.method === "HEAD") return new Response(null, { status: 200, headers });
      return new Response(JSON.stringify({ keys: [] }, null, 2), { status: 200, headers });
    }

    // 6. Agentic Commerce Protocol (ACP)
    if (url.pathname === "/.well-known/acp.json" || url.pathname === "/.well-known/acp.json/") {
      let text = "";
      try {
        const res = await env.ASSETS.fetch(
          new Request(new URL("/.well-known/acp.json", request.url).toString(), {
            method: "GET",
            headers: request.headers,
          })
        );
        if (res.ok) text = await res.text();
      } catch {}
      if (!text.trim()) text = FALLBACK_ACP;

      const headers = new Headers({
        ...SWR_CACHE_HEADERS,
        "content-type": "application/json; charset=utf-8",
      });
      if (request.method === "HEAD") return new Response(null, { status: 200, headers });
      return new Response(text, { status: 200, headers });
    }

    // 7. Auth.md Agent Registration Discovery
    if (url.pathname === "/auth.md" || url.pathname === "/auth.md/") {
      let text = "";
      try {
        const res = await env.ASSETS.fetch(
          new Request(new URL("/auth.md", request.url).toString(), {
            method: "GET",
            headers: request.headers,
          })
        );
        if (res.ok) text = await res.text();
      } catch {}
      if (!text.trim()) text = FALLBACK_AUTH_MD;

      const tokens = Math.ceil(text.length / 4);
      const headers = new Headers({
        ...SWR_CACHE_HEADERS,
        "content-type": "text/markdown; charset=utf-8",
        "vary": "Accept",
        "x-markdown-tokens": String(tokens),
        "link": LINK_HEADERS,
      });
      if (request.method === "HEAD") return new Response(null, { status: 200, headers });
      return new Response(text, { status: 200, headers });
    }

    // 7.5. Live Upstream Telemetry with SWR Caching
    if (url.pathname === "/upstreams.json" || url.pathname === "/upstreams.json/") {
      let upstreamText = "";
      try {
        const upstreamRes = await fetch("https://rpc.mnr.network/upstreams.json", {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(3000),
        });
        if (upstreamRes.ok) {
          upstreamText = await upstreamRes.text();
        }
      } catch {}

      if (!upstreamText.trim()) {
        upstreamText = FALLBACK_UPSTREAMS_JSON;
      }

      const headers = new Headers({
        ...CORS_HEADERS,
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=15, stale-while-revalidate=86400",
        "x-content-type-options": "nosniff",
      });
      if (request.method === "HEAD") return new Response(null, { status: 200, headers });
      return new Response(upstreamText, { status: 200, headers });
    }

    // 8. Content negotiation: check if Markdown is requested
    const wantsMarkdown =
      accept.includes("text/markdown") ||
      url.pathname.endsWith(".md");

    // Static asset extensions to bypass negotiation
    const isStaticAsset = /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?|json|xml|webmanifest|txt)$/i.test(
      url.pathname
    );

    if (wantsMarkdown && !isStaticAsset) {
      let pathname = url.pathname;
      if (pathname.endsWith(".html")) {
        pathname = pathname.replace(/\.html$/, "");
      }
      if (pathname.endsWith("/index")) {
        pathname = pathname.replace(/\/index$/, "");
      }
      if (pathname.endsWith(".md")) {
        pathname = pathname.replace(/\.md$/, "");
      }
      pathname = pathname.replace(/\/+$/, "") || "";

      const primaryMdPath = pathname === "" ? "/index.md" : `${pathname}/index.md`;
      const primaryUrl = new URL(primaryMdPath, request.url);

      // Always fetch internal asset as GET to obtain body and compute tokens accurately
      let mdResponse = await env.ASSETS.fetch(
        new Request(primaryUrl.toString(), {
          method: "GET",
          headers: request.headers,
        })
      );

      // Try alternate .md path if /index.md was not found
      if (!mdResponse.ok && pathname !== "") {
        const altUrl = new URL(`${pathname}.md`, request.url);
        const altResponse = await env.ASSETS.fetch(
          new Request(altUrl.toString(), {
            method: "GET",
            headers: request.headers,
          })
        );
        if (altResponse.ok) {
          mdResponse = altResponse;
        }
      }

      if (mdResponse.ok) {
        const mdText = await mdResponse.text();
        const tokens = Math.ceil(mdText.length / 4);

        const responseHeaders = new Headers({
          "content-type": "text/markdown; charset=utf-8",
          "vary": "Accept",
          "x-markdown-tokens": String(tokens),
          "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
          "x-content-type-options": "nosniff",
          "link": LINK_HEADERS,
        });

        if (request.method === "HEAD") {
          return new Response(null, {
            status: 200,
            headers: responseHeaders,
          });
        }

        return new Response(mdText, {
          status: 200,
          headers: responseHeaders,
        });
      }
    }

    // 9. Default: fetch static asset
    const response = await env.ASSETS.fetch(request);
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      const headers = new Headers(response.headers);
      const existingVary = headers.get("vary");
      if (!existingVary) {
        headers.set("vary", "Accept");
      } else if (!existingVary.toLowerCase().includes("accept")) {
        headers.set("vary", `${existingVary}, Accept`);
      }
      headers.set("link", LINK_HEADERS);
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    return response;
  },
};
