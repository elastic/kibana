import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import type { BulkDeleteResponse, SLODefinitionResponse } from '@kbn/slo-schema';
type ServerError = IHttpFetchError<ResponseErrorBody>;
export declare function useBulkDeleteSlo({ onConfirm }?: {
    onConfirm?: () => void;
}): import("@kbn/react-query").UseMutationResult<BulkDeleteResponse, ServerError, {
    items: Array<Pick<SLODefinitionResponse, "id">>;
}, unknown>;
export {};
