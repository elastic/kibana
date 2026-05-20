import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { Annotation } from '../../../../common/annotations';
export interface FindAnnotationsResponse {
    items: Annotation[];
    total: number;
}
export declare function useFetchAnnotations({ start, end, slo, }: {
    start: string;
    end: string;
    slo?: SLOWithSummaryResponse;
}): {
    data: FindAnnotationsResponse | undefined;
    isLoading: boolean;
    isSuccess: boolean;
    isError: boolean;
    refetch: <TPageData>(options?: (import("@kbn/react-query").RefetchOptions & import("@kbn/react-query").RefetchQueryFilters<TPageData>) | undefined) => Promise<import("@kbn/react-query").QueryObserverResult<FindAnnotationsResponse, unknown>>;
};
