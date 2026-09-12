const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 100;

type PaginationParams = {
  limit: number;
  offset: number;
};

type PaginationMeta = {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

type PaginatedData<T> = {
  items: T[];
  pagination: PaginationMeta;
};

function parsePagination(
  url: string | URL,
  defaultLimit = DEFAULT_PAGE_LIMIT,
  maxLimit = MAX_PAGE_LIMIT,
): PaginationParams {
  const parsedUrl = typeof url === "string" ? new URL(url) : url;
  const rawLimit = parsedUrl.searchParams.get("limit");
  const rawOffset = parsedUrl.searchParams.get("offset");

  const parsedLimit = rawLimit ? parseInt(rawLimit, 10) : defaultLimit;
  const parsedOffset = rawOffset ? parseInt(rawOffset, 10) : 0;

  const limit = Math.max(1, Math.min(isNaN(parsedLimit) ? defaultLimit : parsedLimit, maxLimit));
  const offset = Math.max(0, isNaN(parsedOffset) ? 0 : parsedOffset);

  return { limit, offset };
}

function buildPaginatedResponse<T>(
  items: T[],
  total: number,
  limit: number,
  offset: number,
): PaginatedData<T> {
  return {
    items,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + items.length < total,
    },
  };
}

export { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT, parsePagination, buildPaginatedResponse };
export type { PaginationParams, PaginationMeta, PaginatedData };
