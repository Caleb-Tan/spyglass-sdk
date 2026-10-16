import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { after, before, describe, it } from "node:test";
import { Spyglass, SpyglassError } from "./index.js";

type Seen = { method?: string; path?: string; auth?: string; body?: unknown };

const seen: Seen[] = [];
let server: Server;
let baseUrl = "";

before(async () => {
  server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      const url = new URL(req.url ?? "/", "http://localhost");
      seen.push({
        method: req.method,
        path: `${url.pathname}${url.search}`,
        auth: req.headers.authorization,
        body: raw ? JSON.parse(raw) : undefined,
      });

      if (url.pathname === "/boom") {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            error: {
              code: "invalid_request",
              message: "Provide one of brandIds, names, igUsername, tiktokUsername or query.",
              details: [{ path: "query", message: "Required." }],
            },
          }),
        );
        return;
      }

      if (url.pathname === "/limited") {
        const hits = seen.filter((call) => call.path === "/limited").length;
        if (hits === 1) {
          res.writeHead(429, { "retry-after": "0" });
          res.end(
            JSON.stringify({
              error: { code: "rate_limited", message: "Slow down." },
            }),
          );
          return;
        }
      }

      const path = url.pathname;
      let payload: unknown = { ok: true };
      if (path === "/brands") payload = { count: 1, brands: [{ id: "1", name: "Nike", type: "BRAND" }] };
      if (path === "/creators") payload = { count: 1, creators: [{ id: "c", type: "CREATOR" }] };
      if (path === "/account/1") payload = { id: "1", type: "BRAND", name: "Nike" };
      if (path === "/account/index") payload = { brandId: "1", status: "indexing" };
      if (path === "/account/1/index-status") payload = { status: "ready" };
      if (path === "/account/1/insights") payload = { type: "HOOK", count: 0, buckets: [] };
      if (path === "/account/1/landing-pages") payload = { count: 0, landingPages: [] };
      if (path === "/media") {
        const offset = (JSON.parse(raw) as { offset?: number }).offset ?? 0;
        payload = {
          count: offset === 0 ? 1 : 0,
          media: offset === 0 ? [{ id: "m1" }] : [],
        };
      }
      if (path === "/taxonomies") payload = { paths: ["Apparel > Footwear"], count: 1 };
      if (path === "/comments") payload = { count: 0, posts: [] };
      if (path === "/team/credit-usage") {
        payload = {
          remainingCredits: 10,
          planCredits: 100,
          billingPeriodStart: "2026-01-01T00:00:00Z",
          billingPeriodEnd: "2026-02-01T00:00:00Z",
        };
      }
      if (path === "/limited") payload = { count: 0, brands: [] };

      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(payload));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no port");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(() => server.close());

function client() {
  seen.length = 0;
  return new Spyglass({ apiKey: "sg_live_test", baseUrl });
}

describe("Spyglass", () => {
  it("sends a bearer token and searches brands", async () => {
    const result = await client().brands.search({ names: ["Nike"], limit: 1 });
    assert.equal(result.brands[0]?.name, "Nike");
    assert.equal(seen[0]?.auth, "Bearer sg_live_test");
    assert.equal(seen[0]?.method, "POST");
    assert.deepEqual(seen[0]?.body, { names: ["Nike"], limit: 1 });
  });

  it("covers each resource", async () => {
    const spyglass = client();
    await spyglass.creators.search({ igUsername: "saschafitness" });
    await spyglass.accounts.retrieve("1");
    await spyglass.accounts.index({ websiteUrl: "https://nike.com" });
    await spyglass.accounts.indexStatus("1");
    await spyglass.accounts.insights("1", { type: "HOOK" });
    await spyglass.accounts.landingPages("1", { limit: 10 });
    await spyglass.media.search({ query: "comfort", limit: 20 });
    await spyglass.taxonomies.search({ query: "shoes" });
    await spyglass.comments.list({ instagramIds: ["C2x"] });
    const usage = await spyglass.team.creditUsage();
    assert.equal(usage.remainingCredits, 10);
    assert.deepEqual(
      seen.map((call) => call.path),
      [
        "/creators",
        "/account/1",
        "/account/index",
        "/account/1/index-status",
        "/account/1/insights?type=HOOK",
        "/account/1/landing-pages?limit=10",
        "/media",
        "/taxonomies?query=shoes",
        "/comments",
        "/team/credit-usage",
      ],
    );
  });

  it("pages media until a short page", async () => {
    const ids: string[] = [];
    for await (const ad of client().media.list({ query: "comfort", limit: 1 })) {
      ids.push(ad.id);
    }
    assert.deepEqual(ids, ["m1"]);
    assert.equal(seen.length, 2);
  });

  it("raises a typed error", async () => {
    await assert.rejects(
      () =>
        requestBoom(),
      (error: unknown) => {
        assert.ok(error instanceof SpyglassError);
        assert.equal(error.status, 400);
        assert.equal(error.code, "invalid_request");
        assert.equal(error.details?.[0]?.path, "query");
        return true;
      },
    );
  });

  it("retries a 429 once", async () => {
    client();
    const { request } = await import("./http.js");
    const ok = await request(
      {
        apiKey: "sg_live_test",
        baseUrl,
        timeout: 5000,
        maxRetries: 1,
        fetch: globalThis.fetch,
      },
      "POST",
      "/limited",
      { body: {} },
    );
    assert.deepEqual(ok, { count: 0, brands: [] });
    assert.equal(seen.filter((call) => call.path === "/limited").length, 2);
  });
});

async function requestBoom() {
  const { request } = await import("./http.js");
  return request(
    {
      apiKey: "sg_live_test",
      baseUrl,
      timeout: 5000,
      maxRetries: 0,
      fetch: globalThis.fetch,
    },
    "POST",
    "/boom",
    { body: {} },
  );
}
