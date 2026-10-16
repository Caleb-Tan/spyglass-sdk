import { pages, request, type RequestOptions } from "./http.js";
import type {
  Account,
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

export class Brands {
  constructor(private readonly options: RequestOptions) {}

  search(body: SearchBrandsRequest): Promise<SearchBrandsResponse> {
    return request(this.options, "POST", "/brands", { body });
  }

  list(
    body: SearchBrandsRequest,
  ): AsyncGenerator<SearchBrandsResponse["brands"][number]> {
    return iterate(
      (offset) => this.search({ ...body, offset }),
      (page) => page.brands,
      body.limit ?? 20,
      body.offset ?? 0,
    );
  }
}

export class Creators {
  constructor(private readonly options: RequestOptions) {}

  search(body: SearchCreatorsRequest): Promise<SearchCreatorsResponse> {
    return request(this.options, "POST", "/creators", { body });
  }

  list(
    body: SearchCreatorsRequest,
  ): AsyncGenerator<SearchCreatorsResponse["creators"][number]> {
    return iterate(
      (offset) => this.search({ ...body, offset }),
      (page) => page.creators,
      body.limit ?? 20,
      body.offset ?? 0,
    );
  }
}

export class Accounts {
  constructor(private readonly options: RequestOptions) {}

  retrieve(id: string): Promise<Account> {
    return request(this.options, "GET", `/account/${encodeURIComponent(id)}`);
  }

  index(body: IndexAccountRequest): Promise<IndexAccountResponse> {
    return request(this.options, "POST", "/account/index", { body });
  }

  indexStatus(id: string): Promise<IndexStatus> {
    return request(
      this.options,
      "GET",
      `/account/${encodeURIComponent(id)}/index-status`,
    );
  }

  insights(id: string, query: InsightsQuery): Promise<Insights> {
    return request(
      this.options,
      "GET",
      `/account/${encodeURIComponent(id)}/insights`,
      { query: query as Record<string, unknown> },
    );
  }

  landingPages(id: string, query?: LandingPagesQuery): Promise<LandingPages> {
    return request(
      this.options,
      "GET",
      `/account/${encodeURIComponent(id)}/landing-pages`,
      { query: query as Record<string, unknown> | undefined },
    );
  }
}

export class MediaResource {
  constructor(private readonly options: RequestOptions) {}

  search(body: SearchMediaRequest): Promise<SearchMediaResponse> {
    return request(this.options, "POST", "/media", { body });
  }

  list(body: SearchMediaRequest): AsyncGenerator<Media> {
    return iterate(
      (offset) => this.search({ ...body, offset }),
      (page) => page.media,
      body.limit ?? 100,
      body.offset ?? 0,
    );
  }
}

export class Taxonomies {
  constructor(private readonly options: RequestOptions) {}

  search(query: SearchTaxonomiesQuery): Promise<SearchTaxonomiesResponse> {
    return request(this.options, "GET", "/taxonomies", {
      query: query as Record<string, unknown>,
    });
  }
}

export class Comments {
  constructor(private readonly options: RequestOptions) {}

  list(body: CommentsRequest): Promise<CommentsResponse> {
    return request(this.options, "POST", "/comments", { body });
  }
}

export class Team {
  constructor(private readonly options: RequestOptions) {}

  creditUsage(): Promise<CreditUsage> {
    return request(this.options, "GET", "/team/credit-usage");
  }
}

async function* iterate<TPage, TItem>(
  load: (offset: number) => Promise<TPage>,
  items: (page: TPage) => TItem[],
  limit: number,
  startOffset: number,
): AsyncGenerator<TItem> {
  for await (const page of pages(load, items, limit, startOffset)) {
    for (const item of items(page)) yield item;
  }
}
