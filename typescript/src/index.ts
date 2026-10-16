import { resolveOptions, type RequestOptions } from "./http.js";
import {
  Accounts,
  Brands,
  Comments,
  Creators,
  MediaResource,
  Taxonomies,
  Team,
} from "./resources.js";

export { SpyglassError } from "./error.js";
export type {
  Account,
  ApiErrorCode,
  CommentsRequest,
  CommentsResponse,
  CreditUsage,
  IndexAccountRequest,
  IndexAccountResponse,
  IndexStatus,
  Insights,
  InsightsQuery,
  LandingPages,
  LandingPagesQuery,
  Media,
  SearchBrandsRequest,
  SearchBrandsResponse,
  SearchCreatorsRequest,
  SearchCreatorsResponse,
  SearchMediaRequest,
  SearchMediaResponse,
  SearchTaxonomiesQuery,
  SearchTaxonomiesResponse,
} from "./types.js";

export type SpyglassOptions = {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  fetch?: typeof fetch;
};

export class Spyglass {
  readonly brands: Brands;
  readonly creators: Creators;
  readonly accounts: Accounts;
  readonly media: MediaResource;
  readonly taxonomies: Taxonomies;
  readonly comments: Comments;
  readonly team: Team;

  constructor(options: SpyglassOptions = {}) {
    const resolved: RequestOptions = resolveOptions(options);
    this.brands = new Brands(resolved);
    this.creators = new Creators(resolved);
    this.accounts = new Accounts(resolved);
    this.media = new MediaResource(resolved);
    this.taxonomies = new Taxonomies(resolved);
    this.comments = new Comments(resolved);
    this.team = new Team(resolved);
  }
}
