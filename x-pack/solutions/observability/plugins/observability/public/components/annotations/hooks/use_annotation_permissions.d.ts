export interface AnnotationsPermissions {
    read: boolean;
    write: boolean;
    index: string;
    hasGoldLicense: boolean;
}
export declare function useAnnotationPermissions(): {
    data: AnnotationsPermissions | undefined;
    isLoading: boolean;
    isSuccess: boolean;
    isError: boolean;
    refetch: <TPageData>(options?: (import("@kbn/react-query").RefetchOptions & import("@kbn/react-query").RefetchQueryFilters<TPageData>) | undefined) => Promise<import("@kbn/react-query").QueryObserverResult<AnnotationsPermissions, unknown>>;
};
