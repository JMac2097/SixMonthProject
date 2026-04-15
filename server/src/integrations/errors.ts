export class HttpError extends Error {
  public readonly status: number;
  public readonly url: string;
  public readonly details?: unknown;

  constructor(args: { message: string; status: number; url: string; details?: unknown }) {
    super(args.message);
    this.name = 'HttpError';
    this.status = args.status;
    this.url = args.url;
    this.details = args.details;
  }
}

