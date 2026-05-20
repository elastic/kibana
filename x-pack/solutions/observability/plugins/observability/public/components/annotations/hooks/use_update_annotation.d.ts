import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import type { FindSLOResponse } from '@kbn/slo-schema';
import type { QueryKey } from '@kbn/react-query';
import type { Annotation } from '../../../../common/annotations';
type ServerError = IHttpFetchError<ResponseErrorBody>;
export interface CreateAnnotationResponse {
    _id: string;
    _index: string;
    _source: Annotation;
}
export declare function useUpdateAnnotation(): import("@kbn/react-query").UseMutationResult<CreateAnnotationResponse, ServerError, {
    annotation: Annotation;
}, {
    previousData?: FindSLOResponse;
    queryKey?: QueryKey;
}>;
export {};
