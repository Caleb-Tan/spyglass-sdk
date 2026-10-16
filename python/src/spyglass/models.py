from typing import Any, Literal

from pydantic import BaseModel, ConfigDict

from spyglass.generated import Code, Detail


class APIModel(BaseModel):
    model_config = ConfigDict(extra="allow")


class Brand(APIModel):
    type: Literal["BRAND"]
    id: str
    name: str


class Creator(APIModel):
    type: Literal["CREATOR"]
    id: str
    name: str | None = None


class Account(APIModel):
    type: Literal["BRAND", "CREATOR"]
    id: str
    name: str | None = None


class BrandsResponse(APIModel):
    count: int
    brands: list[Brand]
    unmatchedIds: list[str] | None = None


class CreatorsResponse(APIModel):
    count: int
    creators: list[Creator]
    unmatchedIds: list[str] | None = None


class IndexResponse(APIModel):
    brandId: str
    status: Literal["already_exists", "indexing"]


class IndexStatus(APIModel):
    status: Literal["indexing", "ready"]


class MediaItem(APIModel):
    id: str


class MediaResponse(APIModel):
    count: int
    media: list[MediaItem]


class TaxonomyResponse(APIModel):
    paths: list[str]
    count: int


class LandingPage(APIModel):
    url: str
    total: float


class LandingPagesResponse(APIModel):
    count: int
    landingPages: list[LandingPage]


class Insights(APIModel):
    type: Literal["HOOK", "TARGET_PERSONA", "AD_ANGLE", "MEDIA_MIX"]
    count: int


class Comment(APIModel):
    platformId: str
    text: str


class CommentPost(APIModel):
    platform: str
    platformPostId: str
    comments: list[Comment]
    error: str | None = None


class CommentsResponse(APIModel):
    count: int
    posts: list[CommentPost]


class CreditUsage(APIModel):
    remainingCredits: int
    planCredits: int
    billingPeriodStart: str
    billingPeriodEnd: str


class SpyglassError(Exception):
    def __init__(
        self,
        status: int,
        code: Code | str,
        message: str,
        details: list[Detail] | None = None,
        retry_after: float | None = None,
    ) -> None:
        super().__init__(message)
        self.status = status
        self.code = code.value if isinstance(code, Code) else code
        self.message = message
        self.details = details
        self.retry_after = retry_after


def parse_error(status: int, payload: Any, retry_after: str | None) -> SpyglassError:
    code = "internal_error"
    message = f"Request failed with status {status}."
    details = None
    if isinstance(payload, dict) and isinstance(payload.get("error"), dict):
        error = payload["error"]
        if isinstance(error.get("code"), str):
            code = error["code"]
        if isinstance(error.get("message"), str):
            message = error["message"]
        raw_details = error.get("details")
        if isinstance(raw_details, list):
            details = [
                Detail.model_validate(item)
                for item in raw_details
                if isinstance(item, dict)
            ]
    seconds = None
    if retry_after is not None:
        try:
            seconds = float(retry_after)
        except ValueError:
            seconds = None
    return SpyglassError(status, code, message, details, seconds)

