import type { operations } from "./generated.js";

type Ok<T> = T extends {
  responses: { 200: { content: { "application/json": infer Body } } };
}
  ? Body
  : never;

type Req<T> = T extends {
  requestBody: { content: { "application/json": infer Body } };
}
  ? Body
  : never;

type Query<T> = T extends { parameters: { query?: infer Q } } ? Q : never;

export type SearchBrandsRequest = Req<operations["searchBrandsV2"]>;
export type SearchBrandsResponse = Ok<operations["searchBrandsV2"]>;
export type SearchCreatorsRequest = Req<operations["searchCreators"]>;
export type SearchCreatorsResponse = Ok<operations["searchCreators"]>;
export type Account = Ok<operations["getAccount"]>;
export type IndexAccountRequest = Req<operations["indexBrand"]>;
export type IndexAccountResponse = Ok<operations["indexBrand"]>;
export type IndexStatus = Ok<operations["indexBrandStatus"]>;
export type InsightsQuery = Query<operations["getBrandMediaInsights"]>;
export type Insights = Ok<operations["getBrandMediaInsights"]>;
export type LandingPagesQuery = Query<operations["getBrandLandingPages"]>;
export type LandingPages = Ok<operations["getBrandLandingPages"]>;
export type SearchMediaRequest = Req<operations["getMediaV2"]>;
export type SearchMediaResponse = Ok<operations["getMediaV2"]>;
export type Media = SearchMediaResponse["media"][number];
export type SearchTaxonomiesQuery = Query<operations["searchTaxonomies"]>;
export type SearchTaxonomiesResponse = Ok<operations["searchTaxonomies"]>;
export type CommentsRequest = Req<operations["getComments"]>;
export type CommentsResponse = Ok<operations["getComments"]>;
export type CreditUsage = Ok<operations["getCreditUsage"]>;

export type ApiErrorCode =
  | "invalid_request"
  | "invalid_api_key"
  | "payload_too_large"
  | "out_of_credits"
  | "membership_ended"
  | "subscription_inactive"
  | "brand_not_found"
  | "not_found"
  | "method_not_allowed"
  | "rate_limited"
  | "internal_error";

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode | string;
    message: string;
    details?: { path: string; message: string }[];
  };
};
