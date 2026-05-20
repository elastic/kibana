import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import type { FindSLOResponse } from '@kbn/slo-schema';
import type { QueryKey } from '@kbn/react-query';
import type { Annotation, CreateAnnotationParams } from '../../../../common/annotations';
type ServerError = IHttpFetchError<ResponseErrorBody>;
export interface CreateAnnotationResponse {
    _id: string;
    _index: string;
    _source: Annotation;
}
export declare function useCreateAnnotation(): import("@kbn/react-query").UseMutationResult<CreateAnnotationResponse, ServerError, {
    annotation: CreateAnnotationParams;
}, {
    previousData?: FindSLOResponse;
    queryKey?: QueryKey;
}>;
export {};
