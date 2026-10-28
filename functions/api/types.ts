// Cloudflare Pages Functions Environment Bindings
export interface Env {
  DB: D1Database;
  PAYMENT_BUCKET: R2Bucket;
  ADMIN_SECRET?: string;
  JWT_SECRET?: string;
  PUBG_API_KEY?: string;
  ENVIRONMENT?: string;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Response<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = any>(colName?: string): Promise<T | null>;
  run<T = any>(): Promise<D1Response<T>>;
  all<T = any>(): Promise<D1Result<T>>;
}

export interface D1Response<T = any> {
  success: boolean;
  meta: Record<string, any>;
  error?: string;
  results?: T[];
}

export interface D1Result<T = any> {
  results: T[];
  success: boolean;
  meta: Record<string, any>;
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

export interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>;
  put(key: string, value: any, options?: R2PutOptions): Promise<R2Object>;
  delete(keys: string | string[]): Promise<void>;
}

export interface R2PutOptions {
  httpMetadata?: Record<string, string>;
  customMetadata?: Record<string, string>;
}

export interface R2Object {
  key: string;
  size: number;
  etag: string;
  httpEtag: string;
  uploaded: Date;
}

export interface R2ObjectBody extends R2Object {
  body: ReadableStream;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
  json<T = unknown>(): Promise<T>;
  blob(): Promise<Blob>;
}

export interface EventContext<E, P extends string = any, D = any> {
  request: Request;
  functionPath: string;
  waitUntil: (promise: Promise<any>) => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  env: E;
  params: Record<P, string | string[]>;
  data: D;
}

export type PagesFunction<
  E = Env,
  P extends string = any,
  D extends Record<string, unknown> = Record<string, unknown>
> = (context: EventContext<E, P, D>) => Response | Promise<Response>;

declare global {
  type PagesFunction<
    E = any,
    P extends string = any,
    D extends Record<string, unknown> = Record<string, unknown>
  > = (context: EventContext<E, P, D>) => Response | Promise<Response>;
}
