export type ExtractCallable<T> = T extends (...args: never[]) => unknown
  ? (...args: Parameters<T>) => ReturnType<T>
  : never;

export type Awaited<T> = T extends PromiseLike<infer U> ? U : T;
