import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import type { BulkPurgeRollupInput, BulkPurgeRollupResponse, SLODefinitionResponse } from '@kbn/slo-schema';
type ServerError = IHttpFetchError<ResponseErrorBody>;
type Input = Omit<BulkPurgeRollupInput, 'list'> & {
    list: SLODefinitionResponse[];
};
export declare function useBulkPurgeRollup({ onConfirm }?: {
    onConfirm?: () => void;
}): import("@kbn/react-query").UseMutationResult<BulkPurgeRollupResponse, ServerError, Input, unknown>;
export {};
