<p align="center">
  <img src="https://raw.githubusercontent.com/Caleb-Tan/spyglass-sdk/main/assets/wordmark.svg" alt="Spyglass" width="280" />
</p>

<p align="center">
  The API layer for the social internet.<br />
  Search brands, creators, and the ads they run.
</p>

<p align="center">
  <a href="https://docs.spyglass.so">Docs</a>
  &nbsp;·&nbsp;
  <a href="https://spyglass.so">spyglass.so</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/Caleb-Tan/spyglass-sdk">GitHub</a>
</p>

Official TypeScript client for the Spyglass API. Server-side only: the API does not send CORS headers.

```bash
npm install @spyglass/sdk
```

Create a key in [Settings → API](https://app.spyglass.so). It starts with `sg_live_` and is shown once.

```ts
import { Spyglass } from "@spyglass/sdk";

const spyglass = new Spyglass({ apiKey: process.env.SPYGLASS_API_KEY });

const { brands } = await spyglass.brands.search({ names: ["Nike"], limit: 1 });
const account = await spyglass.accounts.retrieve(brands[0].id);

for await (const ad of spyglass.media.list({
  brandId: account.id,
  limit: 100,
})) {
  console.log(ad.id, ad.title);
}

const usage = await spyglass.team.creditUsage();
```

`SPYGLASS_API_KEY` is used when `apiKey` is omitted. `baseUrl`, `timeout`, and `maxRetries` are available for tests.

## Resources

| Method | Endpoint |
| --- | --- |
| `brands.search` / `brands.list` | `POST /brands` |
| `creators.search` / `creators.list` | `POST /creators` |
| `accounts.retrieve` | `GET /account/{id}` |
| `accounts.index` | `POST /account/index` |
| `accounts.indexStatus` | `GET /account/{id}/index-status` |
| `accounts.insights` | `GET /account/{id}/insights` |
| `accounts.landingPages` | `GET /account/{id}/landing-pages` |
| `media.search` / `media.list` | `POST /media` |
| `taxonomies.search` | `GET /taxonomies` |
| `comments.list` | `POST /comments` |
| `team.creditUsage` | `GET /team/credit-usage` |

`list` pages with `offset` until a page is shorter than `limit`, or the next offset would pass 9999. `count` is the rows in that response, not a total.

## Errors and credits

`SpyglassError` carries `status`, `code`, `message`, and `retryAfter`. A `429` is retried once (at most 30 seconds). Other client errors are not retried.

Most calls spend monthly credits per row returned. Bound them with `limit`. Indexing, taxonomies, and credit usage are free. Details are in the [billing docs](https://docs.spyglass.so/billing).

Python: [`spyglass-sdk`](https://pypi.org/project/spyglass-sdk/).
