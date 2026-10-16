<p align="center">
  <img src="./assets/wordmark.svg" alt="Spyglass" width="280" />
</p>

<p align="center">
  The API layer for the social internet.<br />
  Search brands, creators, and the ads they run.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@spyglass/sdk">npm</a>
  &nbsp;·&nbsp;
  <a href="https://pypi.org/project/spyglass-sdk/">PyPI</a>
  &nbsp;·&nbsp;
  <a href="https://docs.spyglass.so">Docs</a>
  &nbsp;·&nbsp;
  <a href="https://spyglass.so">spyglass.so</a>
</p>

Official clients for the [Spyglass API](https://docs.spyglass.so). Calls are server-to-server: the API does not send CORS headers, so use these from your backend.

## Install

```bash
npm install @spyglass/sdk
```

```bash
pip install spyglass-sdk
```

Create a key in [Settings → API](https://app.spyglass.so). It starts with `sg_live_` and is shown once.

## TypeScript

```ts
import { Spyglass } from "@spyglass/sdk";

const spyglass = new Spyglass({ apiKey: process.env.SPYGLASS_API_KEY });

const { brands } = await spyglass.brands.search({ names: ["Nike"], limit: 1 });
const account = await spyglass.accounts.retrieve(brands[0].id);

for await (const ad of spyglass.media.list({ brandId: account.id, limit: 100 })) {
  console.log(ad.id, ad.title);
}

const usage = await spyglass.team.creditUsage();
```

`SPYGLASS_API_KEY` is read when you omit `apiKey`. Point tests at a mock with `baseUrl`.

## Python

```python
import os
from spyglass import Spyglass

spyglass = Spyglass(api_key=os.environ["SPYGLASS_API_KEY"])

brands = spyglass.brands.search(names=["Nike"], limit=1)
account = spyglass.accounts.retrieve(brands.brands[0].id)

for ad in spyglass.media.list(brandId=account.id, limit=100):
    print(ad.id)

usage = spyglass.team.credit_usage()
```

## Resources

| Resource | What it answers |
| --- | --- |
| `brands.search` | Which brand is this? Who else is in this space? |
| `creators.search` | Which creator is this? Who matches this audience? |
| `accounts.retrieve` | What do we know about an id you already have? |
| `accounts.index` | Index a brand we do not have yet. |
| `accounts.indexStatus` | Has that brand finished indexing? |
| `media.search` / `media.list` | What creatives match this brand or theme? |
| `taxonomies.search` | Which product-category paths match this phrase? |
| `accounts.insights` | Which hooks, personas, and formats does it lean on? |
| `accounts.landingPages` | Where does its ad traffic go? |
| `comments.list` | What are people saying on this post? |
| `team.creditUsage` | How many credits are left? |

Python methods use `index_status`, `landing_pages`, and `credit_usage`. Request fields stay in the API's camelCase (`brandId`, `igUsername`).

`list` walks `offset` until a page comes back shorter than `limit`, or the next offset would pass 9999. `count` is the number of rows in that page, not a total.

## Errors

Failures throw `SpyglassError` with `status`, `code`, `message`, and `retryAfter` when the API sends `Retry-After`. A `429` is retried once, waiting at most 30 seconds. Other `4xx` responses are not retried.

Calls spend the same monthly credits as the rest of Spyglass, per row returned. Bound every search with `limit`. Indexing, taxonomies, and credit usage are free. See [Billing](https://docs.spyglass.so/billing).

## Packages

| Language | Package | Source |
| --- | --- | --- |
| TypeScript | [`@spyglass/sdk`](https://www.npmjs.com/package/@spyglass/sdk) | [`typescript/`](./typescript) |
| Python | [`spyglass-sdk`](https://pypi.org/project/spyglass-sdk/) | [`python/`](./python) |

Both are generated from [`openapi/openapi-v2.json`](./openapi/openapi-v2.json), the v2 contract at `https://api.spyglass.so/v2`.
