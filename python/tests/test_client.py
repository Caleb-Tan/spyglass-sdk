import json

import httpx
import pytest

from spyglass import Spyglass, SpyglassError
from spyglass.models import BrandsResponse


def app(request: httpx.Request) -> httpx.Response:
    path = request.url.path
    body = json.loads(request.content) if request.content else {}
    assert request.headers["authorization"] == "Bearer sg_live_test"
    if path == "/boom":
        return httpx.Response(
            400,
            json={
                "error": {
                    "code": "invalid_request",
                    "message": "Bad query.",
                    "details": [{"path": "query", "message": "Required."}],
                }
            },
        )
    if path == "/limited":
        hits = getattr(app, "hits", 0) + 1
        app.hits = hits
        if hits == 1:
            return httpx.Response(
                429,
                headers={"retry-after": "0"},
                json={"error": {"code": "rate_limited", "message": "Slow down."}},
            )
        return httpx.Response(200, json={"count": 0, "brands": []})
    if path == "/media":
        offset = body.get("offset") or 0
        return httpx.Response(
            200,
            json={
                "count": 1 if offset == 0 else 0,
                "media": [{"id": "m1"}] if offset == 0 else [],
            },
        )
    payloads = {
        "/brands": {
            "count": 1,
            "brands": [{"id": "1", "name": "Nike", "type": "BRAND"}],
        },
        "/creators": {
            "count": 1,
            "creators": [{"id": "c", "name": "Sasha", "type": "CREATOR"}],
        },
        "/account/1": {"id": "1", "type": "BRAND", "name": "Nike"},
        "/account/index": {"brandId": "1", "status": "indexing"},
        "/account/1/index-status": {"status": "ready"},
        "/account/1/insights": {"type": "HOOK", "count": 0},
        "/account/1/landing-pages": {"count": 0, "landingPages": []},
        "/taxonomies": {"paths": ["Apparel > Footwear"], "count": 1},
        "/comments": {"count": 0, "posts": []},
        "/team/credit-usage": {
            "remainingCredits": 10,
            "planCredits": 100,
            "billingPeriodStart": "2026-01-01T00:00:00Z",
            "billingPeriodEnd": "2026-02-01T00:00:00Z",
        },
    }
    return httpx.Response(200, json=payloads[path])


def client(**kwargs: object) -> Spyglass:
    app.hits = 0
    http = httpx.Client(transport=httpx.MockTransport(app))
    return Spyglass(
        api_key="sg_live_test",
        base_url="http://spyglass.test",
        http_client=http,
        **kwargs,
    )


def test_search_brands():
    result = client().brands.search(names=["Nike"], limit=1)
    assert result.brands[0].name == "Nike"


def test_each_resource():
    spyglass = client()
    spyglass.creators.search(igUsername="saschafitness")
    spyglass.accounts.retrieve("1")
    spyglass.accounts.index(websiteUrl="https://nike.com")
    spyglass.accounts.index_status("1")
    spyglass.accounts.insights("1", type="HOOK")
    spyglass.accounts.landing_pages("1", limit=10)
    spyglass.media.search(query="comfort", limit=20)
    spyglass.taxonomies.search(query="shoes")
    spyglass.comments.list(instagramIds=["C2x"])
    assert spyglass.team.credit_usage().remainingCredits == 10


def test_media_pager():
    ids = [item.id for item in client().media.list(query="comfort", limit=1)]
    assert ids == ["m1"]


def test_typed_error():
    spyglass = client(max_retries=0)
    with pytest.raises(SpyglassError) as caught:
        spyglass._transport.request("POST", "/boom", body={}, model=BrandsResponse)
    assert caught.value.status == 400
    assert caught.value.code == "invalid_request"
    assert caught.value.details[0].path == "query"


def test_retries_429():
    spyglass = client()
    page = spyglass._transport.request(
        "POST", "/limited", body={}, model=BrandsResponse
    )
    assert page.count == 0
    assert app.hits == 2
