import type { DataViewListItem } from '@kbn/data-views-plugin/public';
export interface UseFetchDataViewsResponse {
    isLoading: boolean;
    isSuccess: boolean;
    isError: boolean;
    data: DataViewListItem[] | undefined;
}
export declare function useFetchDataViews(): {
    isLoading: boolean;
    isError: boolean;
    isSuccess: boolean;
    data: DataViewListItem[] | undefined;
    refetch: <TPageData>(options?: (import("@kbn/react-query").RefetchOptions & import("@kbn/react-query").RefetchQueryFilters<TPageData>) | undefined) => Promise<import("@kbn/react-query").QueryObserverResult<DataViewListItem[], unknown>>;
};
