import type { GetSLOTemplateResponse } from '@kbn/slo-schema';
export interface UseFetchSloTemplateResponse {
    isInitialLoading: boolean;
    isError: boolean;
    data: GetSLOTemplateResponse | undefined;
}
export declare function useFetchSloTemplate(templateId?: string): UseFetchSloTemplateResponse;
