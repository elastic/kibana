import type { FilterProps } from './columns/filter_expanded';
export declare function useFilterValues({ field, series, baseFilters, label }: FilterProps, query?: string): {
    values: import("../../../../../../observability_shared/public/hooks/use_values_list").ListItem[];
    loading?: boolean;
};
