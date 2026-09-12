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
  defaultLimit = 20,
  maxLimit = 100,
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

export type { PaginationParams, PaginationMeta, PaginatedData };
export { parsePagination, buildPaginatedResponse };
