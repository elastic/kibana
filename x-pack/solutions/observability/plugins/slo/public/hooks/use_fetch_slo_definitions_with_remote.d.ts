import type { SearchSLODefinitionResponse } from '@kbn/slo-schema';
export interface UseFetchSloDefinitionsWithRemoteResponse {
    data: SearchSLODefinitionResponse | undefined;
    isLoading: boolean;
    isError: boolean;
    isSuccess: boolean;
    refetch: () => void;
}
interface SLODefinitionsParams {
    search?: string;
    size?: number;
    searchAfter?: string;
    remoteName?: string;
}
export declare function useFetchSloDefinitionsWithRemote({ search, size, searchAfter, remoteName, }: SLODefinitionsParams): UseFetchSloDefinitionsWithRemoteResponse;
export {};
