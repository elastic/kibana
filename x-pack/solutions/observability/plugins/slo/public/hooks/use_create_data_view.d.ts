interface UseCreateDataViewProps {
    indexPatternString?: string;
    dataViewId?: string;
}
export declare function useCreateDataView({ indexPatternString, dataViewId }: UseCreateDataViewProps): {
    dataView: import("@kbn/data-views-plugin/common").DataView | undefined;
    loading: boolean;
};
export {};
