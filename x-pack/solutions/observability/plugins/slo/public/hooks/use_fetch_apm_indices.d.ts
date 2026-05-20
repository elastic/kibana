export interface ApmIndicesData {
    metric: string;
    transaction: string;
    span: string;
}
export interface UseFetchApmIndices {
    data: ApmIndicesData;
    isLoading: boolean;
    isSuccess: boolean;
    isError: boolean;
}
export declare function useFetchApmIndices({ enabled, }?: {
    enabled?: boolean;
}): UseFetchApmIndices;
