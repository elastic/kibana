import type { FindSLOInstancesResponse } from '@kbn/slo-schema';
interface Params {
    sloId: string;
    search?: string;
    searchAfter?: string;
    size?: number;
    enabled?: boolean;
    remoteName?: string;
}
interface Response {
    data: FindSLOInstancesResponse | undefined;
    isLoading: boolean;
    isInitialLoading: boolean;
    isError: boolean;
}
export declare function useFetchSloInstances({ sloId, search, searchAfter, size, enabled, remoteName, }: Params): Response;
export {};
