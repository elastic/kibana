import type { GetSLOResponse } from '@kbn/slo-schema';
import type { QueryObserverResult, RefetchOptions, RefetchQueryFilters } from '@kbn/react-query';
export interface UseFetchSloDetailsResponse {
    isInitialLoading: boolean;
    isLoading: boolean;
    isRefetching: boolean;
    isSuccess: boolean;
    isError: boolean;
    data: GetSLOResponse | undefined;
    refetch: <TPageData>(options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined) => Promise<QueryObserverResult<GetSLOResponse | undefined, unknown>>;
}
export declare function useFetchSloDetails({ sloId, instanceId, remoteName, shouldRefetch, }: {
    sloId?: string;
    instanceId?: string;
    remoteName?: string;
    shouldRefetch?: boolean;
}): UseFetchSloDetailsResponse;
