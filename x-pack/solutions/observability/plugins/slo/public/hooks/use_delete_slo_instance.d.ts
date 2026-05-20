import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
type ServerError = IHttpFetchError<ResponseErrorBody>;
export declare function useDeleteSloInstance(): import("@kbn/react-query").UseMutationResult<void, ServerError, {
    slo: {
        id: string;
        instanceId: string;
        name: string;
    };
    excludeRollup: boolean;
}, unknown>;
export {};
