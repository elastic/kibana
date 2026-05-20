import type { GetHealthScanResultsResponse } from '@kbn/slo-schema';
export interface UseGetHealthScanResultsParams {
    scanId: string;
    size?: number;
    searchAfter?: string;
    problematic?: boolean;
    allSpaces?: boolean;
    refetchInterval?: number | false;
}
export interface UseGetHealthScanResults {
    data: GetHealthScanResultsResponse | undefined;
    isLoading: boolean;
    isError: boolean;
}
export declare function useGetHealthScanResults({ scanId, size, searchAfter, problematic, allSpaces, refetchInterval, }: UseGetHealthScanResultsParams): UseGetHealthScanResults;
