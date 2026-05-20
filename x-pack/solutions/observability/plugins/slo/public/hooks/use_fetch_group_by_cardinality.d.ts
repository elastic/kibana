import type { QuerySchema } from '@kbn/slo-schema';
export interface UseFetchGroupByCardinalityResponse {
    isLoading: boolean;
    isSuccess: boolean;
    isError: boolean;
    data?: {
        cardinality: number;
        isHighCardinality: boolean;
    };
}
export declare function useFetchGroupByCardinality(indexPattern: string, timestampField: string | undefined, groupBy: string | string[], filters?: QuerySchema): UseFetchGroupByCardinalityResponse;
