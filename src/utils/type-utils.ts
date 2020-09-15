export type Callable<T> = T extends (...args: never[]) => unknown ? (...args: Parameters<T>) => ReturnType<T> : never;

export type PromiseValueType<T> = T extends PromiseLike<infer U> ? U : T;
