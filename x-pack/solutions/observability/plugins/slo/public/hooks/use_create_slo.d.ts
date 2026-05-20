import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import type { QueryKey } from '@kbn/react-query';
import { type CreateSLOInput, type FindSLOResponse } from '@kbn/slo-schema';
type ServerError = IHttpFetchError<ResponseErrorBody>;
export declare function useCreateSlo(): import("@kbn/react-query").UseMutationResult<{
    id: string;
}, ServerError, {
    slo: CreateSLOInput;
}, {
    previousData?: FindSLOResponse;
    queryKey?: QueryKey;
}>;
export {};
