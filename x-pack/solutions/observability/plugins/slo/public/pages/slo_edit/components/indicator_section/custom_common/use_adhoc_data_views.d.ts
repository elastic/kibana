import type { DataView, DataViewListItem } from '@kbn/data-views-plugin/common';
export declare const getDataViewPatternOrId: ({ byId, byPattern, dataViewsList, adHocDataViews, }: {
    byId?: string;
    byPattern?: string;
    dataViewsList: DataViewListItem[];
    adHocDataViews: DataView[];
}) => string | undefined;
export declare const useAdhocDataViews: ({ currentIndexPattern }: {
    currentIndexPattern: string;
}) => {
    adHocDataViews: DataView[];
    setAdHocDataViews: import("react").Dispatch<import("react").SetStateAction<DataView[]>>;
    dataViewsList: DataViewListItem[];
    isDataViewsLoading: boolean;
    refetchDataViewsList: <TPageData>(options?: (import("@tanstack/query-core").RefetchOptions & import("@tanstack/query-core").RefetchQueryFilters<TPageData>) | undefined) => Promise<import("@tanstack/query-core").QueryObserverResult<DataViewListItem[], unknown>>;
};
