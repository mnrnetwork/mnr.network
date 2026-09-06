interface Env {
  ASSETS: {
    fetch: (request: Request | string, init?: RequestInit) => Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const accept = request.headers.get("accept") || "";

    // 1. Content negotiation: check if Markdown is requested
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
        // Token estimation (~4 chars per token for English text)
        const tokens = Math.ceil(mdText.length / 4);

        const responseHeaders = new Headers({
          "content-type": "text/markdown; charset=utf-8",
          "vary": "Accept",
          "x-markdown-tokens": String(tokens),
          "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
          "x-content-type-options": "nosniff",
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

    // 2. Default: fetch static asset
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
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    return response;
  },
};
