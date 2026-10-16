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

Official Python client for the Spyglass API. Server-side only.

```bash
pip install spyglass-sdk
```

```python
import os
from spyglass import Spyglass

spyglass = Spyglass(api_key=os.environ["SPYGLASS_API_KEY"])

brands = spyglass.brands.search(names=["Nike"], limit=1)
account = spyglass.accounts.retrieve(brands.brands[0].id)

for ad in spyglass.media.list(brandId=account.id, limit=100):
    print(ad.id)

print(spyglass.team.credit_usage().remainingCredits)
```

Request fields use the API's camelCase (`brandId`, `igUsername`). Methods are `index_status`, `landing_pages`, and `credit_usage`.

`list` pages with `offset` until a short page. `SpyglassError` exposes `status`, `code`, `message`, and `retry_after`. A 429 is retried once.

Calls spend monthly credits per row returned. See [billing](https://docs.spyglass.so/billing).
