import os
import time
from collections.abc import Iterator
from typing import Any, TypeVar
from urllib.parse import quote

import httpx

from spyglass.models import (
    Account,
    BrandsResponse,
    CommentsResponse,
    CreatorsResponse,
    CreditUsage,
    IndexResponse,
    IndexStatus,
    Insights,
    LandingPagesResponse,
    MediaItem,
    MediaResponse,
    SpyglassError,
    TaxonomyResponse,
    parse_error,
)

T = TypeVar("T")
DEFAULT_BASE_URL = "https://api.spyglass.so/v2"
MAX_RETRY_WAIT = 30.0


class _Transport:
    def __init__(
        self,
        api_key: str,
        base_url: str,
        timeout: float,
        max_retries: int,
        client: httpx.Client | None,
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries
        self._client = client or httpx.Client(timeout=timeout)
        self._owns_client = client is None

    def close(self) -> None:
        if self._owns_client:
            self._client.close()

    def request(
        self,
        method: str,
        path: str,
        *,
        body: dict[str, Any] | None = None,
        query: dict[str, Any] | None = None,
        model: type[T],
    ) -> T:
        attempt = 0
        while True:
            response = self._client.request(
                method,
                f"{self.base_url}{path}",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Accept": "application/json",
                },
                json=body,
                params={k: v for k, v in (query or {}).items() if v is not None},
            )
            if response.status_code < 400:
                return model.model_validate(response.json())
            error = parse_error(
                response.status_code,
                _json(response),
                response.headers.get("retry-after"),
            )
            if response.status_code == 429 and attempt < self.max_retries:
                attempt += 1
                time.sleep(min(error.retry_after or 1, MAX_RETRY_WAIT))
                continue
            raise error


def _json(response: httpx.Response) -> Any:
    try:
        return response.json()
    except ValueError:
        return None


def _pages(
    load,
    items,
    limit: int,
    start: int,
) -> Iterator:
    offset = start
    while offset <= 9999:
        page = load(offset)
        rows = items(page)
        yield from rows
        if len(rows) < limit:
            return
        nxt = offset + limit
        if nxt > 9999:
            return
        offset = nxt


class Brands:
    def __init__(self, transport: _Transport) -> None:
        self._transport = transport

    def search(self, **body: Any) -> BrandsResponse:
        return self._transport.request("POST", "/brands", body=body, model=BrandsResponse)

    def list(self, **body: Any) -> Iterator:
        limit = int(body.get("limit") or 20)
        start = int(body.get("offset") or 0)

        def load(offset: int) -> BrandsResponse:
            return self.search(**{**body, "offset": offset})

        return _pages(load, lambda page: page.brands, limit, start)


class Creators:
    def __init__(self, transport: _Transport) -> None:
        self._transport = transport

    def search(self, **body: Any) -> CreatorsResponse:
        return self._transport.request(
            "POST", "/creators", body=body, model=CreatorsResponse
        )

    def list(self, **body: Any) -> Iterator:
        limit = int(body.get("limit") or 20)
        start = int(body.get("offset") or 0)

        def load(offset: int) -> CreatorsResponse:
            return self.search(**{**body, "offset": offset})

        return _pages(load, lambda page: page.creators, limit, start)


class Accounts:
    def __init__(self, transport: _Transport) -> None:
        self._transport = transport

    def retrieve(self, id: str) -> Account:
        return self._transport.request(
            "GET", f"/account/{quote(id, safe='')}", model=Account
        )

    def index(self, **body: Any) -> IndexResponse:
        return self._transport.request(
            "POST", "/account/index", body=body, model=IndexResponse
        )

    def index_status(self, id: str) -> IndexStatus:
        return self._transport.request(
            "GET",
            f"/account/{quote(id, safe='')}/index-status",
            model=IndexStatus,
        )

    def insights(self, id: str, **query: Any) -> Insights:
        return self._transport.request(
            "GET",
            f"/account/{quote(id, safe='')}/insights",
            query=query,
            model=Insights,
        )

    def landing_pages(self, id: str, **query: Any) -> LandingPagesResponse:
        return self._transport.request(
            "GET",
            f"/account/{quote(id, safe='')}/landing-pages",
            query=query,
            model=LandingPagesResponse,
        )


class Media:
    def __init__(self, transport: _Transport) -> None:
        self._transport = transport

    def search(self, **body: Any) -> MediaResponse:
        return self._transport.request("POST", "/media", body=body, model=MediaResponse)

    def list(self, **body: Any) -> Iterator[MediaItem]:
        limit = int(body.get("limit") or 100)
        start = int(body.get("offset") or 0)

        def load(offset: int) -> MediaResponse:
            return self.search(**{**body, "offset": offset})

        return _pages(load, lambda page: page.media, limit, start)


class Taxonomies:
    def __init__(self, transport: _Transport) -> None:
        self._transport = transport

    def search(self, **query: Any) -> TaxonomyResponse:
        return self._transport.request(
            "GET", "/taxonomies", query=query, model=TaxonomyResponse
        )


class Comments:
    def __init__(self, transport: _Transport) -> None:
        self._transport = transport

    def list(self, **body: Any) -> CommentsResponse:
        return self._transport.request(
            "POST", "/comments", body=body, model=CommentsResponse
        )


class Team:
    def __init__(self, transport: _Transport) -> None:
        self._transport = transport

    def credit_usage(self) -> CreditUsage:
        return self._transport.request(
            "GET", "/team/credit-usage", model=CreditUsage
        )


class Spyglass:
    def __init__(
        self,
        api_key: str | None = None,
        *,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = 60,
        max_retries: int = 1,
        http_client: httpx.Client | None = None,
    ) -> None:
        key = api_key or os.environ.get("SPYGLASS_API_KEY")
        if not key:
            raise ValueError("Missing API key. Pass api_key or set SPYGLASS_API_KEY.")
        self._transport = _Transport(key, base_url, timeout, max_retries, http_client)
        self.brands = Brands(self._transport)
        self.creators = Creators(self._transport)
        self.accounts = Accounts(self._transport)
        self.media = Media(self._transport)
        self.taxonomies = Taxonomies(self._transport)
        self.comments = Comments(self._transport)
        self.team = Team(self._transport)

    def close(self) -> None:
        self._transport.close()

    def __enter__(self) -> "Spyglass":
        return self

    def __exit__(self, *args: object) -> None:
        self.close()
