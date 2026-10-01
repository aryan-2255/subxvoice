export type ErrorCode = "not_implemented" | "unsupported" | "permission_denied" | "provider";

export class SubxError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "SubxError";
    this.code = code;
  }
}

export const notImplemented = (what: string) =>
  new SubxError("not_implemented", `Not implemented yet: ${what}`);
