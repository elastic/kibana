import type { ListHealthScanResponse } from '@kbn/slo-schema';
export interface UseListHealthScansParams {
    size?: number;
    refetchInterval?: number | false;
}
export interface UseListHealthScans {
    data: ListHealthScanResponse | undefined;
    isLoading: boolean;
    isError: boolean;
}
export declare function useListHealthScans({ size, refetchInterval, }?: UseListHealthScansParams): UseListHealthScans;
