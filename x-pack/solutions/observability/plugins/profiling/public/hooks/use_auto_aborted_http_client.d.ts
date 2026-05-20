import type { Overwrite, ValuesType } from 'utility-types';
import type { HttpFetchOptions, HttpHandler, HttpStart } from '@kbn/core/public';
declare const HTTP_METHODS: readonly ["fetch", "get", "post", "put", "delete", "patch"];
type HttpMethod = ValuesType<typeof HTTP_METHODS>;
type AutoAbortedHttpMethod = (path: string, options: Omit<HttpFetchOptions, 'signal'>) => ReturnType<HttpHandler>;
export type AutoAbortedHttpService = Overwrite<HttpStart, Record<HttpMethod, AutoAbortedHttpMethod>>;
export declare function useAutoAbortedHttpClient(dependencies: any[]): AutoAbortedHttpService;
export {};
