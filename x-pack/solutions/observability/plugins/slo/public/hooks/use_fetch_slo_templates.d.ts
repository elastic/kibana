import type { FindSLOTemplatesResponse } from '@kbn/slo-schema';
interface UseFetchSloTemplatesParams {
    search?: string;
    tags?: string[];
    page?: number;
    perPage?: number;
}
export interface UseFetchSloTemplatesResponse {
    isLoading: boolean;
    isError: boolean;
    data: FindSLOTemplatesResponse | undefined;
}
export declare function useFetchSloTemplates({ search, tags, page, perPage, }?: UseFetchSloTemplatesParams): UseFetchSloTemplatesResponse;
export {};
