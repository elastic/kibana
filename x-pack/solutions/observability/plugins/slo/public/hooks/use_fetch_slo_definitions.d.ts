import type { FindSLODefinitionsResponse } from '@kbn/slo-schema';
export interface UseFetchSloDefinitionsResponse {
    data: FindSLODefinitionsResponse | undefined;
    isLoading: boolean;
    isSuccess: boolean;
    isError: boolean;
    refetch: () => void;
}
interface SLODefinitionParams {
    name?: string;
    includeOutdatedOnly?: boolean;
    tags?: string[];
    page?: number;
    perPage?: number;
    includeHealth?: boolean;
}
export declare function useFetchSloDefinitions({ name, includeOutdatedOnly, tags, page, perPage, includeHealth, }: SLODefinitionParams): UseFetchSloDefinitionsResponse;
export {};
