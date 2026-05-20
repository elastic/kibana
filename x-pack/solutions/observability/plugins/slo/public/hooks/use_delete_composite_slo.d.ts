import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
type ServerError = IHttpFetchError<ResponseErrorBody>;
export declare function useDeleteCompositeSlo(): import("@kbn/react-query").UseMutationResult<void, ServerError, {
    id: string;
    name: string;
}, unknown>;
export {};
