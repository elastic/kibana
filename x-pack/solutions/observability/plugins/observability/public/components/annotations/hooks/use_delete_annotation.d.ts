import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import type { QueryKey } from '@kbn/react-query';
import type { Annotation } from '../../../../common/annotations';
type ServerError = IHttpFetchError<ResponseErrorBody>;
export declare function useDeleteAnnotation(): import("@kbn/react-query").UseMutationResult<void, ServerError, {
    annotations: Annotation[];
}, {
    queryKey?: QueryKey;
}>;
export {};
