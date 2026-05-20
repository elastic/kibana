import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { type PurgeInstancesResponse } from '@kbn/slo-schema';
type ServerError = IHttpFetchError<ResponseErrorBody>;
export declare function usePurgeInstances({ onConfirm }?: {
    onConfirm?: () => void;
}): import("@kbn/react-query").UseMutationResult<PurgeInstancesResponse, ServerError, {
    list?: string[] | undefined;
    staleDuration?: string | undefined;
    force?: boolean | undefined;
}, unknown>;
export {};
