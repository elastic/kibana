import type { FindSLOTemplateTagsResponse } from '@kbn/slo-schema';
export interface UseFetchSloTemplateTagsResponse {
    isLoading: boolean;
    isError: boolean;
    data: FindSLOTemplateTagsResponse | undefined;
}
export declare function useFetchSloTemplateTags(): UseFetchSloTemplateTagsResponse;
