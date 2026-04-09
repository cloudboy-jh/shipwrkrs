type PagesFunction<E = unknown> = (context: {
  request: Request;
  env: E;
  params: Record<string, string>;
  waitUntil(promise: Promise<unknown>): void;
  data: Record<string, unknown>;
}) => Response | Promise<Response>;

type Ai = {
  run(model: string, input: unknown): Promise<unknown>;
};
