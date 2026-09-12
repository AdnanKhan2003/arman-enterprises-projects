import { ZodError } from "zod";
import { auth } from "./auth";
import {
  OK,
  BAD_REQUEST,
  UNAUTHORIZED,
  FORBIDDEN,
  INTERNAL_SERVER_ERROR,
} from "./http";

type FieldError = { field: string; message: string };

type ApiResponse<T = unknown> = {
  isApiResponse: true;
  statusCode: number;
  message: string;
  data: T;
};

type ApiError = Error & {
  isApiError: true;
  statusCode: number;
  errors: FieldError[];
};

type ApiBody<T = unknown> = {
  success: boolean;
  message: string;
  data: T | null;
  errors: FieldError[] | null;
};

function apiResponse<T>(statusCode: number, data: T, message = "Success"): ApiResponse<T> {
  return { isApiResponse: true, statusCode, message, data };
}

function apiError(statusCode: number, message: string, errors: FieldError[] = []): ApiError {
  return Object.assign(new Error(message), {
    name: "ApiError",
    isApiError: true as const,
    statusCode,
    errors,
  });
}

function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  return typeof value === "object" && value !== null && "isApiResponse" in value;
}

function isApiError(value: unknown): value is ApiError {
  return value instanceof Error && "isApiError" in value;
}

type ApiRouteHandler = (
  request: Request,
  context: Record<string, string>
) => Promise<Response | ApiResponse<any> | any>;

function withErrorHandling(handler: ApiRouteHandler) {
  return async (request: Request, context: Record<string, string> = {}): Promise<Response> => {
    try {
      const result = await handler(request, context);

      if (result instanceof Response) {
        return result;
      }

      if (isApiResponse(result)) {
        const body: ApiBody<unknown> = {
          success: true,
          message: result.message,
          data: result.data,
          errors: null,
        };
        return Response.json(body, { status: result.statusCode });
      }

      const body: ApiBody<unknown> = {
        success: true,
        message: "Success",
        data: result,
        errors: null,
      };
      return Response.json(body, { status: OK });
    } catch (error) {
      if (isApiError(error)) {
        const body: ApiBody<null> = {
          success: false,
          message: error.message,
          data: null,
          errors: error.errors.length > 0 ? error.errors : null,
        };
        return Response.json(body, { status: error.statusCode });
      }

      if (error instanceof ZodError) {
        const errors: FieldError[] = error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }));
        const body: ApiBody<null> = {
          success: false,
          message: error.issues[0]?.message || "Validation error",
          data: null,
          errors,
        };
        return Response.json(body, { status: BAD_REQUEST });
      }

      console.error("Unhandled API error:", error);
      const body: ApiBody<null> = {
        success: false,
        message: "Internal Server Error",
        data: null,
        errors: null,
      };
      return Response.json(body, { status: INTERNAL_SERVER_ERROR });
    }
  };
}

async function requireAuth(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    throw apiError(UNAUTHORIZED, "Unauthorized");
  }
  return session;
}

function requireRole(session: { user: { role?: string | null } }, ...allowedRoles: string[]) {
  if (!session.user.role || !allowedRoles.includes(session.user.role)) {
    throw apiError(FORBIDDEN, "Forbidden");
  }
}

export type { ApiBody, ApiError, ApiResponse, FieldError, ApiRouteHandler };
export {
  apiError,
  apiResponse,
  isApiError,
  isApiResponse,
  withErrorHandling,
  requireAuth,
  requireRole,
};
