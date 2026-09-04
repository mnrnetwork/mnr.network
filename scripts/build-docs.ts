import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";

// Configure marked with GitHub Flavored Markdown
marked.setOptions({
  gfm: true,
  breaks: false,
});

interface DocMeta {
  id: string;
  route: string;
  sourceFile?: string;
  title: string;
  navTitle: string;
  badge?: string;
  description: string;
  /** Engineering plans rendered from the code repo: which `## N.` sections
   *  are public. Everything else (schedules, budgets, decisions) is dropped. */
  plan?: PlanFilter;
}

interface PlanFilter {
  /** Path in the code repo, relative to this repo's parent. */
  upstream: string;
  /** Section numbers to keep, by their `## N.` heading. */
  keepSections: number[];
  /** Intro shown above the rendered plan. */
  lead: string;
  /** Lines matching any of these are dropped (people, tenants, internal refs). */
  dropLineIf?: RegExp[];
  /** Phrase rewrites so the text reads for the public, not for the team. */
  replace?: [RegExp, string][];
}

const DOCS: DocMeta[] = [
  {
    id: "hub",
    route: "/docs/",
    title: "Documentation",
    navTitle: "Overview",
    description:
      "How mnr verifies Monero RPC, the rules it follows toward public nodes, the per-method policy, and the roadmap.",
  },
  {
    id: "how-it-works",
    route: "/docs/how-it-works/",
    sourceFile: "content/how-it-works.md",
    title: "How mnr works",
    navTitle: "How it works",
    badge: "Live",
    description:
      "What the verified proxy checks, the seven rules it follows toward public Monero nodes, how the upstream pool is ranked, and how to connect a stock wallet.",
  },
  {
    id: "method-policy",
    route: "/docs/method-policy/",
    sourceFile: "content/method-policy.md",
    title: "Monero RPC Method Policy & Verification Rules",
    navTitle: "Method Policy",
    badge: "Generated",
    description:
      "Verification rules, cache bounds, upstream quorum requirements and timeout budgets for every Monero daemon JSON-RPC and legacy method, generated from the relay's source code.",
  },
  {
    id: "roadmap",
    route: "/docs/roadmap/",
    sourceFile: "content/roadmap.md",
    title: "Roadmap",
    navTitle: "Roadmap",
    badge: "Stages 0–2",
    description:
      "The three stages of mnr: the verified proxy that is live today, the owned mesh with an SLA, and the permissionless operator network paid in XMR.",
  },
  {
    id: "stage0-mvp",
    route: "/docs/stage0-mvp/",
    sourceFile: "content/stage0-mvp-plan.md",
    title: "Verified Monero RPC proxy over public nodes: rules, upstream pool, verification (Stage 0)",
    navTitle: "Stage 0 plan",
    badge: "Plan",
    description:
      "Engineering notes for the Stage 0 verified proxy: the seven rules toward public Monero nodes, upstream probing and quorum tip, block and transaction hash verification, method policy, caching, token auth, limits, and the single-binary architecture.",
    plan: {
      upstream: "../mnr/docs/stage0-mvp-plan.md",
      keepSections: [1, 2, 3, 4, 5, 6, 8],
      lead:
        "The engineering notes behind Stage 0, the verified proxy that is live today. Rendered from the [plan in the code repository](https://github.com/mnrnetwork/mnr/blob/main/docs/stage0-mvp-plan.md) with the build schedule and internal decisions left out. For the short version, read [How mnr works](/docs/how-it-works/).",
      dropLineIf: [/Ripley|KYC\.RIP/],
      replace: [
        [/Seed list curated by B from/g, "Seed list curated from"],
        [/but B emails or messages every operator/g, "but we contact every operator"],
        [/, and the gate to each is in §9\./g, "."],
        [/\$9 is deliberately a supporter price\. It pays the two boxes at ~15 subscribers, and it tests the only question Stage 0 needs to answer: \*(.*?)\*/g, "$9 is deliberately a supporter price. It tests one question: *$1*"],
      ],
    },
  },
  {
    id: "stage1-gateway",
    route: "/docs/stage1-gateway/",
    sourceFile: "content/stage1-gateway-development-plan.md",
    title: "Monero RPC gateway architecture: quorum, caching, verification and XMR billing (Stage 1)",
    navTitle: "Stage 1 plan",
    badge: "Plan",
    description:
      "Engineering notes for the Stage 1 gateway: owned monerod nodes on independent providers, edge authentication with path tokens and Basic auth, rate limiting, per-method policy and cache safety, node infrastructure, and view-only wallet billing with XMR invoices.",
    plan: {
      upstream: "../mnr/docs/stage1-gateway-development-plan.md",
      keepSections: [1, 2, 3, 4, 5, 8],
      lead:
        "The engineering notes behind Stage 1, the owned mesh with an SLA. Rendered from the [plan in the code repository](https://github.com/mnrnetwork/mnr/blob/main/docs/stage1-gateway-development-plan.md) with milestones, cost model and internal decisions left out. See the [roadmap](/docs/roadmap/) for where this sits.",
      dropLineIf: [/Ripley|KYC\.RIP|dogfood/i],
    },
  },
  {
    id: "stage2-network",
    route: "/docs/stage2-network/",
    sourceFile: "content/stage2-network-protocol-architecture.md",
    title: "mnr network protocol: monerod operators, relayers, fault log and XMR settlement (Stage 2)",
    navTitle: "Stage 2 protocol",
    badge: "Protocol",
    description:
      "Protocol and architecture notes for the Stage 2 operator network: roles and trust boundaries, session auth and metering, verification and agreement rules, the cryptographic fault log, the operator directory, and weekly XMR settlement without stake or slashing.",
    plan: {
      upstream: "../mnr/docs/stage2-network-protocol-architecture.md",
      keepSections: [1, 2, 3, 4],
      lead:
        "The protocol and component design behind Stage 2, the permissionless operator network. Rendered from the [architecture document in the code repository](https://github.com/mnrnetwork/mnr/blob/main/docs/stage2-network-protocol-architecture.md) with the build plan and internal decisions left out. See the [roadmap](/docs/roadmap/) for the principles in brief.",
      dropLineIf: [/Ripley|KYC\.RIP/],
    },
  },
];

// The method policy is generated from mnr-core; when the code repo is
// checked out next to this one, refresh the vendored copy at build time so
// the page can never drift from the code.
const METHOD_POLICY_SOURCE = "../mnr/docs/method-policy.md";

function renderNavTabs(currentId: string): string {
  return `
    <nav class="docs-tabs" aria-label="Documentation sections">
      ${DOCS.map((d) => {
        const isActive = d.id === currentId;
        return `<a href="${d.route}" class="doc-tab ${isActive ? "active" : ""}">
          <span>${d.navTitle}</span>
          ${d.badge ? `<span class="tab-badge">${d.badge}</span>` : ""}
        </a>`;
      }).join("\n      ")}
    </nav>
  `;
}

function renderHtmlLayout(doc: DocMeta, contentHtml: string): string {
  const canonicalUrl = `https://mnr.network${doc.route}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: doc.title,
        description: doc.description,
        isPartOf: {
          "@type": "WebSite",
          "@id": "https://mnr.network/#website",
          url: "https://mnr.network/",
          name: "mnr",
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumbs`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "mnr",
            item: "https://mnr.network/",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "docs",
            item: "https://mnr.network/docs/",
          },
          ...(doc.id !== "hub"
            ? [
                {
                  "@type": "ListItem",
                  position: 3,
                  name: doc.navTitle,
                  item: canonicalUrl,
                },
              ]
            : []),
        ],
      },
    ],
  };

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${doc.title} — mnr</title>
  <meta name="description" content="${doc.description}">
  <link rel="canonical" href="${canonicalUrl}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <meta property="og:title" content="${doc.title} — mnr">
  <meta property="og:description" content="${doc.description}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:site_name" content="mnr">
  <meta property="og:image" content="https://mnr.network/og.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${doc.title} — mnr">
  <meta name="twitter:description" content="${doc.description}">
  <meta name="twitter:image" content="https://mnr.network/og.png">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
  <link rel="icon" href="/favicon-16.png" sizes="16x16" type="image/png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="alternate" type="text/markdown" title="LLM context" href="/llms.txt">
  <script type="application/ld+json">
  ${JSON.stringify(jsonLd, null, 2)}
  </script>
  <script>
    try { var t = localStorage.getItem('mnr-theme'); if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t); } catch (e) {}
  </script>
  <style>
    @font-face {
      font-family: "Geist";
      font-style: normal;
      font-weight: 100 900;
      font-display: swap;
      src: url("/fonts/geist-latin.woff2") format("woff2");
      unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
    }
    @font-face {
      font-family: "Geist Mono";
      font-style: normal;
      font-weight: 100 900;
      font-display: swap;
      src: url("/fonts/geist-mono-latin.woff2") format("woff2");
      unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
    }
    :root {
      --accent: #F26822;
      --bg: #FBFAF8; --bg-alt: #F3EFEA; --fg: #1B1917; --fg-2: #4A4541; --muted: #6B655F; --card: #FFFFFF;
      --line: #E8E3DD; --line-strong: #DDD8D2; --log-bg: #1B1917; --log-fg: #E9E4DE;
      --inverse-bg: #1B1917; --inverse-fg: #E9E4DE; --inverse-strong: #FFFFFF; --inverse-muted: #B8B1A9; --inverse-line: #3A3531;
      --pill-bg: #FFF4E5;
      color-scheme: light;
    }
    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) {
        --bg: #141210; --bg-alt: #1B1917; --fg: #ECE7E1; --fg-2: #C9C2BA; --muted: #9A938B; --card: #1E1B18;
        --line: #2E2A26; --line-strong: #3A3531; --log-bg: #0E0D0C; --log-fg: #E9E4DE;
        --inverse-bg: #221F1B; --inverse-fg: #E9E4DE; --inverse-strong: #FFFFFF; --inverse-muted: #B8B1A9; --inverse-line: #3F3A35;
        --pill-bg: #3A2A14;
        color-scheme: dark;
      }
    }
    :root[data-theme="dark"] {
      --bg: #141210; --bg-alt: #1B1917; --fg: #ECE7E1; --fg-2: #C9C2BA; --muted: #9A938B; --card: #1E1B18;
      --line: #2E2A26; --line-strong: #3A3531; --log-bg: #0E0D0C; --log-fg: #E9E4DE;
      --inverse-bg: #221F1B; --inverse-fg: #E9E4DE; --inverse-strong: #FFFFFF; --inverse-muted: #B8B1A9; --inverse-line: #3F3A35;
      --pill-bg: #3A2A14;
      color-scheme: dark;
    }

    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { margin: 0; background: var(--bg); color: var(--fg); font-family: "Geist", "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 16.5px; line-height: 1.65; -webkit-font-smoothing: antialiased; }
    a { color: var(--fg); text-decoration: none; } a:hover { color: #C2410C; }
    p { margin: 0 0 16px; }
    .mono { font-family: "Geist Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace; }
    .wrap { max-width: 1120px; margin: 0 auto; padding: 0 32px; }
    .doc-wrap { max-width: 920px; margin: 0 auto; padding: 48px 32px 96px; }
    .rule { height: 1px; background: var(--line); }
    
    .navlinks { display: flex; gap: 28px; align-items: center; font-size: 15px; font-weight: 500; }
    .btn { display: inline-flex; align-items: center; justify-content: center; height: 44px; padding: 0 20px; border-radius: 10px; font-weight: 600; font-size: 15px; white-space: nowrap; }
    .btn-primary { background: var(--accent); color: #FFFFFF; } .btn-primary:hover { background: #C2410C; color: #FFFFFF; }
    .btn-sm { height: 40px; padding: 0 16px; font-size: 14px; }
    .theme-btn { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 10px; border: 1px solid var(--line-strong); background: var(--card); color: var(--fg); cursor: pointer; padding: 0; }
    .theme-btn .sun { display: none; } .theme-btn .moon { display: block; }
    :root[data-theme="dark"] .theme-btn .sun { display: block; } :root[data-theme="dark"] .theme-btn .moon { display: none; }
    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) .theme-btn .sun { display: block; }
      :root:not([data-theme="light"]) .theme-btn .moon { display: none; }
    }
    .mark { display: block; flex: none; color: var(--fg); }

    /* Docs Navigation & Tabs */
    .docs-tabs-bar { background: var(--bg-alt); border-bottom: 1px solid var(--line); padding: 10px 0; position: sticky; top: 0; z-index: 10; backdrop-filter: blur(12px); }
    .docs-tabs { display: flex; gap: 8px; overflow-x: auto; padding: 4px 0; -webkit-overflow-scrolling: touch; }
    .doc-tab { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; font-size: 14px; font-weight: 500; color: var(--fg-2); border: 1px solid transparent; white-space: nowrap; transition: all 0.15s ease; }
    .doc-tab:hover { background: var(--card); border-color: var(--line); color: var(--fg); }
    .doc-tab.active { background: var(--card); border-color: var(--line-strong); color: var(--fg); font-weight: 600; }
    .tab-badge { font-size: 11px; padding: 2px 6px; border-radius: 999px; background: var(--pill-bg); border: 1px solid var(--line); color: var(--accent); font-family: "Geist Mono", monospace; }

    /* Breadcrumbs */
    .breadcrumbs { display: flex; align-items: center; gap: 8px; font-size: 13.5px; color: var(--muted); margin-bottom: 24px; font-family: "Geist Mono", monospace; }
    .breadcrumbs a { color: var(--muted); } .breadcrumbs a:hover { color: var(--accent); }
    .breadcrumbs span { color: var(--fg); }

    /* Prose Styling */
    .prose { color: var(--fg); line-height: 1.7; }
    .prose p, .prose li, .prose blockquote { overflow-wrap: break-word; }
    .prose h1 { font-size: 38px; line-height: 1.15; letter-spacing: -0.02em; font-weight: 700; margin: 0 0 20px; }
    .prose h2 { font-size: 26px; line-height: 1.25; letter-spacing: -0.015em; font-weight: 600; margin: 48px 0 16px; padding-bottom: 8px; border-bottom: 1px solid var(--line); }
    .prose h3 { font-size: 20px; line-height: 1.35; font-weight: 600; margin: 32px 0 12px; }
    .prose h4 { font-size: 17px; font-weight: 600; margin: 24px 0 8px; }
    .prose ul, .prose ol { margin: 0 0 20px; padding-left: 24px; }
    .prose li { margin-bottom: 8px; }
    .prose hr { border: 0; height: 1px; background: var(--line); margin: 40px 0; }
    .prose blockquote { margin: 24px 0; padding: 12px 20px; border-left: 3px solid var(--accent); background: var(--bg-alt); border-radius: 0 8px 8px 0; color: var(--fg-2); }
    .prose blockquote p:last-child { margin-bottom: 0; }

    .prose code:not(pre code) {
      font-family: "Geist Mono", monospace;
      font-size: 13.5px;
      background: var(--bg-alt);
      border: 1px solid var(--line);
      border-radius: 5px;
      padding: 2px 6px;
      color: var(--fg);
    }
    .prose pre {
      background: var(--log-bg);
      color: var(--log-fg);
      border-radius: 12px;
      padding: 18px 20px;
      font-size: 13.5px;
      line-height: 1.6;
      overflow-x: auto;
      margin: 24px 0;
      border: 1px solid var(--line);
      font-family: "Geist Mono", monospace;
    }
    .prose pre code { background: transparent; padding: 0; border: 0; color: inherit; }

    /* Tables */
    .prose .table-wrap {
      overflow-x: auto;
      margin: 28px 0;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: var(--card);
      -webkit-overflow-scrolling: touch;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
    }
    .prose table.doc-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
      line-height: 1.55;
      margin: 0;
      text-align: left;
    }
    .prose table.table-wide {
      min-width: 900px;
    }
    .prose table.table-ultra-wide {
      min-width: 1240px;
    }
    .prose th,
    .prose td {
      padding: 12px 16px;
      border-bottom: 1px solid var(--line);
      vertical-align: top;
      word-break: normal;
      overflow-wrap: normal;
    }
    .prose th {
      font-weight: 600;
      font-size: 12px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--muted);
      background: var(--bg-alt);
      border-bottom: 1px solid var(--line-strong);
      white-space: nowrap;
      vertical-align: bottom;
    }
    .prose td code {
      white-space: nowrap;
      font-size: 13px;
    }
    .prose tbody tr:last-child td { border-bottom: 0; }
    .prose tbody tr:hover td { background: var(--bg-alt); }

    /* Specific column rules for method policy table */
    .prose table.table-ultra-wide th:nth-child(1),
    .prose table.table-ultra-wide td:nth-child(1) {
      white-space: nowrap;
      min-width: 190px;
    }
    .prose table.table-ultra-wide th:nth-child(2),
    .prose table.table-ultra-wide td:nth-child(2) {
      white-space: nowrap;
      min-width: 90px;
    }
    .prose table.table-ultra-wide th:nth-child(3),
    .prose table.table-ultra-wide td:nth-child(3) {
      white-space: nowrap;
      min-width: 95px;
    }
    .prose table.table-ultra-wide th:nth-child(4),
    .prose table.table-ultra-wide td:nth-child(4) {
      min-width: 250px;
    }
    .prose table.table-ultra-wide th:nth-child(5),
    .prose table.table-ultra-wide td:nth-child(5) {
      min-width: 240px;
    }
    .prose table.table-ultra-wide th:nth-child(6),
    .prose table.table-ultra-wide td:nth-child(6) {
      white-space: nowrap;
      min-width: 120px;
    }
    .prose table.table-ultra-wide th:nth-child(7),
    .prose table.table-ultra-wide td:nth-child(7) {
      white-space: nowrap;
      min-width: 95px;
      text-align: right;
    }
    .prose table.table-ultra-wide th:nth-child(8),
    .prose table.table-ultra-wide td:nth-child(8) {
      min-width: 240px;
    }

    /* Hub Cards */
    .hub-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; margin: 32px 0 48px; }
    .hub-card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 24px; transition: border-color 0.15s ease, transform 0.15s ease; display: flex; flex-direction: column; gap: 10px; }
    .hub-card:hover { border-color: var(--accent); transform: translateY(-2px); }
    .hub-card h3 { font-size: 18px; font-weight: 600; margin: 0; color: var(--fg); }
    .hub-card p { font-size: 14.5px; color: var(--muted); margin: 0; line-height: 1.5; }
    .hub-card-meta { display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 12px; font-size: 13px; font-family: "Geist Mono", monospace; color: var(--accent); }

    @media (max-width: 768px) {
      .wrap, .doc-wrap { padding: 0 20px; }
      .navlinks { display: none; }
      .hub-grid { grid-template-columns: 1fr; }
      .prose h1 { font-size: 30px; }
      .prose h2 { font-size: 22px; }
    }
  </style>
</head>
<body>

  <!-- Header -->
  <header class="wrap" style="display: flex; align-items: center; justify-content: space-between; height: 72px;">
    <a href="/" style="display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 22px; letter-spacing: -0.02em;" aria-label="mnr home">
      <svg class="mark" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><circle cx="16.5" cy="12" r="5.2" fill="var(--accent)"/><path d="M5.2 6.6 L11.9 10.1 M5.2 17.4 L11.9 13.9" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="5.2" cy="6.6" r="2.1" fill="currentColor"/><circle cx="5.2" cy="17.4" r="2.1" fill="currentColor"/></svg>
      <span>mnr</span>
    </a>
    <nav class="navlinks" aria-label="Sections">
      <a href="/#how">How it works</a>
      <a href="/#upstreams">Upstreams</a>
      <a href="/#pricing">Pricing</a>
      <a href="/docs/" style="color: var(--accent); font-weight: 600;">Docs</a>
      <a href="https://github.com/mnrnetwork/mnr" target="_blank" rel="noopener noreferrer" class="mono" style="font-weight: 500;">GitHub</a>
    </nav>
    <div style="display: flex; align-items: center; gap: 12px;">
      <button class="theme-btn" id="theme-toggle" type="button" title="Switch light / dark" aria-label="Switch light / dark">
        <svg class="sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>
        <svg class="moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"></path></svg>
      </button>
      <a href="/#pricing" class="btn btn-primary btn-sm">Get a free token</a>
    </div>
  </header>
  <div class="rule"></div>

  <!-- Docs Sub-Nav Tabs -->
  <div class="docs-tabs-bar">
    <div class="wrap">
      ${renderNavTabs(doc.id)}
    </div>
  </div>

  <!-- Document Body -->
  <main class="doc-wrap">
    <div class="breadcrumbs">
      <a href="/">mnr</a>
      <span>/</span>
      <a href="/docs/">docs</a>
      ${doc.id !== "hub" ? `<span>/</span><span>${doc.id}</span>` : ""}
    </div>

    <article class="prose">
      ${contentHtml}
    </article>
  </main>

  <div class="rule"></div>

  <!-- Footer -->
  <footer class="wrap" style="padding: 48px 32px;">
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; font-size: 14px;" class="muted">
        <span>mnr — an RPC network for Monero</span>
        <span>·</span>
        <a href="https://github.com/mnrnetwork/mnr" target="_blank" rel="noopener noreferrer" style="text-decoration: underline;">AGPL-3.0</a>
      </div>
      <div style="display: flex; gap: 24px; font-size: 14px;">
        <a href="/">Home</a>
        <a href="/docs/">Docs Hub</a>
        <a href="/docs/method-policy/">Method Policy</a>
        <a href="https://github.com/mnrnetwork/mnr" target="_blank" rel="noopener noreferrer">GitHub</a>
      </div>
    </div>
  </footer>

  <script>
    (function () {
      var btn = document.getElementById('theme-toggle');
      var root = document.documentElement;
      function current() {
        var t = root.getAttribute('data-theme');
        if (t === 'light' || t === 'dark') return t;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      btn.addEventListener('click', function () {
        var next = current() === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('mnr-theme', next); } catch (e) {}
      });
    })();
  </script>
</body>
</html>`;
}

function generateHubHtml(): string {
  return `
    <h1 style="font-size: 42px; margin-bottom: 12px;">mnr Documentation</h1>
    <p style="font-size: 19px; color: var(--fg-2); margin-bottom: 36px;">
      What the verified proxy checks, the rules it follows toward the public nodes it uses, and where it is going.
    </p>

    <div class="hub-grid">
      <a href="/docs/how-it-works/" class="hub-card">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <h3>How mnr works</h3>
          <span class="tab-badge">Live</span>
        </div>
        <p>The seven rules toward public nodes, the upstream pool and quorum tip, what is verified and what is only annotated, and how to connect a stock wallet.</p>
        <div class="hub-card-meta">
          <span>Read how it works &rarr;</span>
        </div>
      </a>

      <a href="/docs/method-policy/" class="hub-card">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <h3>Method Policy & Verification</h3>
          <span class="tab-badge">Generated</span>
        </div>
        <p>Every Monero daemon method the relay serves, with its verification rule, cache bound, quorum and timeout. Generated from the relay's source code.</p>
        <div class="hub-card-meta">
          <span>Read the policy table &rarr;</span>
        </div>
      </a>

      <a href="/docs/roadmap/" class="hub-card">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <h3>Roadmap</h3>
          <span class="tab-badge">Stages 0&ndash;2</span>
        </div>
        <p>The verified proxy that is live today, the owned mesh with an SLA, and the permissionless operator network where node runners are paid in XMR for verified work.</p>
        <div class="hub-card-meta">
          <span>Read the roadmap &rarr;</span>
        </div>
      </a>

      <a href="https://github.com/mnrnetwork/mnr" class="hub-card" target="_blank" rel="noopener noreferrer">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <h3>Source code</h3>
          <span class="tab-badge">AGPL-3.0</span>
        </div>
        <p>The relay, the core verification crate with its fixtures and fuzz targets, and the full engineering plans behind each stage.</p>
        <div class="hub-card-meta">
          <span>github.com/mnrnetwork/mnr &rarr;</span>
        </div>
      </a>
    </div>

    <h2>Engineering notes</h2>
    <p>The plans behind each stage, rendered from the code repository with schedules and internal decisions left out. Long, specific, and the place to look when the short pages above are not enough.</p>
    <ul>
      <li><a href="/docs/stage0-mvp/">Stage 0: verified proxy over public nodes</a> &mdash; rules toward public nodes, upstream pool and quorum tip, what is verified, method policy, caching, auth and limits, architecture, risks.</li>
      <li><a href="/docs/stage1-gateway/">Stage 1: gateway architecture</a> &mdash; owned nodes on independent providers, the request path specification, node infrastructure, XMR billing and provisioning, testing and acceptance.</li>
      <li><a href="/docs/stage2-network/">Stage 2: network protocol</a> &mdash; operators, relayers and clients, trust boundaries, the protocol specification, the fault log and settlement, component design.</li>
    </ul>

    <h2>Reading order</h2>
    <ul>
      <li><strong>Using mnr:</strong> <a href="/docs/how-it-works/">How mnr works</a> covers what you get, what is verified, and how to point a wallet at it.</li>
      <li><strong>Running a public node:</strong> the <a href="/docs/how-it-works/#rules-toward-public-nodes">rules toward public nodes</a> say exactly how mnr treats your node and how to opt out.</li>
      <li><strong>Building on it:</strong> the <a href="/docs/method-policy/">method policy</a> is the per-method contract: what is cached, for how long, and what <code>Mnr-Verify</code> will say.</li>
      <li><strong>Where it goes:</strong> the <a href="/docs/roadmap/">roadmap</a> describes the two later stages and links to the full plans in the repository.</li>
    </ul>
  `;
}

/** GitHub-style heading ids so sections can be linked to. */
function slugify(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;|&#\d+;/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function processMarkdown(raw: string): string {
  let html = marked.parse(raw) as string;
  html = html.replace(/<h([2-4])>([\s\S]*?)<\/h\1>/g, (_m, level, inner) => {
    return `<h${level} id="${slugify(inner)}">${inner}</h${level}>`;
  });
  html = html.replace(/<table>([\s\S]*?)<\/table>/g, (_match, inner) => {
    const firstRowMatch = inner.match(/<tr>([\s\S]*?)<\/tr>/);
    const thCount = firstRowMatch ? (firstRowMatch[1].match(/<th\b/g) || []).length : 0;
    let cls = "doc-table";
    if (thCount >= 7) cls += " table-ultra-wide";
    else if (thCount >= 5) cls += " table-wide";
    return `<div class="table-wrap"><table class="${cls}">${inner}</table></div>`;
  });
  return html;
}

/**
 * Keep the title, the italic subtitle and the listed `## N.` sections of an
 * engineering plan; drop the metadata table, every other section and any
 * line the filter names. Sections are matched by number so a renumbering
 * upstream is caught by the smoke check in `build()`.
 */
function filterPlan(md: string, f: PlanFilter): string {
  const out: string[] = [];
  let keep = true;
  let inPreamble = true;
  for (const line of md.split("\n")) {
    const h2 = line.match(/^## (\d+)\./);
    if (h2) {
      inPreamble = false;
      keep = f.keepSections.includes(Number(h2[1]));
      if (keep && out.length && out[out.length - 1] !== "---") out.push("---", "");
    }
    if (!keep) continue;
    if (inPreamble && (line.startsWith("|") || line === "---")) continue;
    if (f.dropLineIf?.some((re) => re.test(line))) continue;
    out.push(line);
  }
  let text = out.join("\n").replace(/\n{3,}/g, "\n\n").replace(/(---\n\n)+---/g, "---");
  for (const [re, to] of f.replace ?? []) text = text.replace(re, to);
  return text;
}

function generateSitemap(): string {
  const today = new Date().toISOString().split("T")[0];
  const urls: { loc: string; lastmod: string; changefreq: string; priority: string }[] = [
    {
      loc: "https://mnr.network/",
      lastmod: today,
      changefreq: "weekly",
      priority: "1.0",
    },
  ];

  for (const doc of DOCS) {
    urls.push({
      loc: `https://mnr.network${doc.route}`,
      lastmod: today,
      changefreq: doc.id === "hub" ? "weekly" : "monthly",
      priority: doc.id === "hub" ? "0.9" : "0.8",
    });
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;
}

function build() {
  console.log("Building onsite documentation...");

  // Engineering plans: refresh the vendored copies from the code repo when
  // it is checked out next to this one, then keep only the public sections.
  for (const doc of DOCS) {
    if (!doc.plan || !doc.sourceFile) continue;
    if (fs.existsSync(doc.plan.upstream)) {
      fs.copyFileSync(doc.plan.upstream, doc.sourceFile);
      console.log(`✓ Refreshed ${doc.sourceFile} from ${doc.plan.upstream}`);
    }
    const raw = fs.readFileSync(doc.sourceFile, "utf-8");
    const found = [...raw.matchAll(/^## (\d+)\./gm)].map((m) => Number(m[1]));
    for (const n of doc.plan.keepSections) {
      if (!found.includes(n)) throw new Error(`${doc.sourceFile}: section ${n} not found (renumbered upstream?)`);
    }
  }

  if (fs.existsSync(METHOD_POLICY_SOURCE)) {
    fs.copyFileSync(METHOD_POLICY_SOURCE, "content/method-policy.md");
    console.log(`✓ Refreshed content/method-policy.md from ${METHOD_POLICY_SOURCE}`);
  } else {
    console.log("· ../mnr not found, using the vendored content/method-policy.md");
  }

  // 1. Build Hub (/docs/)
  const hubDoc = DOCS.find((d) => d.id === "hub")!;
  const hubHtml = renderHtmlLayout(hubDoc, generateHubHtml());
  fs.mkdirSync("public/docs", { recursive: true });
  fs.writeFileSync("public/docs/index.html", hubHtml);
  console.log("✓ Created public/docs/index.html");

  // 2. Build Sub-Docs
  for (const doc of DOCS) {
    if (!doc.sourceFile) continue;
    let rawMd = fs.readFileSync(doc.sourceFile, "utf-8");
    if (doc.plan) {
      rawMd = filterPlan(rawMd, doc.plan);
      // Title and subtitle first, then the lead, then the sections.
      const cut = rawMd.indexOf("\n\n");
      rawMd = `${rawMd.slice(0, cut)}\n\n> ${doc.plan.lead}\n${rawMd.slice(cut)}`;
    }
    const parsedHtml = processMarkdown(rawMd);
    const pageHtml = renderHtmlLayout(doc, parsedHtml);

    const outDir = path.join("public", doc.route);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "index.html"), pageHtml);
    console.log(`✓ Created ${path.join(outDir, "index.html")}`);
  }

  // 3. Generate Sitemap (/sitemap.xml)
  const sitemapXml = generateSitemap();
  fs.writeFileSync("public/sitemap.xml", sitemapXml);
  console.log("✓ Updated public/sitemap.xml");

  console.log("Done building all documentation pages!");
}

build();
