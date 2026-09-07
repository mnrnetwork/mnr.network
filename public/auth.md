# auth.md — Agent Registration & Authentication for mnr (Monero Network Relay)

Welcome to the **mnr (Monero Network Relay)** verified Monero RPC network (`mnr.network`). This document specifies authentication, registration, and discovery protocols for autonomous AI agents, LLMs, and client software.

> [!NOTE]
> **Entity Disambiguation**: **mnr** refers specifically to the **Monero Network Relay** (`mnr.network`, RPC: `rpc.mnr.network`). It is an open-source, trust-minimized, anti-KYC RPC proxy network for Monero (XMR). It is completely unrelated to MTA Metro-North Railroad (MNR), the Ontario Ministry of Natural Resources (MNR / MNRF), or the `mnr` npm package.

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

- **Endpoint**: `POST https://rpc.mnr.network/v1/tokens/free`
- **Method**: `POST`
- **Headers**:
  - `Content-Type: application/json`
  - `Accept: application/json`
- **Body**: `{}` (empty object or omitted)

#### Response (`200 OK`)
```json
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
```

### 2. Token Rotation

If an agent suspects key exposure or requires rotation:

- **Endpoint**: `POST https://rpc.mnr.network/v1/{current_token}/rotate`
- **Headers**:
  - `Authorization: Bearer {current_token}`
- **Response**: Returns a freshly generated replacement bearer token; the old token is invalidated immediately.

---

## Credential Usage

mnr accepts authentication in two standard formats:

### Header Authentication (RFC 6750)
```http
POST /v1/{token}/json_rpc HTTP/1.1
Host: rpc.mnr.network
Authorization: Bearer <your-bearer-token>
Content-Type: application/json

{"jsonrpc":"2.0","id":"0","method":"get_info"}
```

### Path-Scoped Proxy Authentication
For Monero wallets and CLI tools that lack custom header configuration:
```
https://rpc.mnr.network/v1/<your-bearer-token>/json_rpc
```
Or via HTTP Basic Auth username:
```bash
monero-wallet-cli --daemon-address rpc.mnr.network:443 --daemon-login <your-bearer-token>:x --daemon-ssl enabled
```

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

- **Supported Identity Types**: `["anonymous"]`
- **Supported Credential Types**: `["bearer_token"]`
- **Claim URI**: `https://mnr.network/get-token/`
- **Registration URI**: `https://rpc.mnr.network/v1/tokens/free`
