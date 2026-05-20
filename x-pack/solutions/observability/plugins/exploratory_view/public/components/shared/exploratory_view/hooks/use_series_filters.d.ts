import type { SeriesUrl } from '../types';
export interface UpdateFilter {
    field: string;
    value: string | Array<string | number>;
    negate?: boolean;
    wildcards?: string[];
    isWildcard?: boolean;
}
export declare const useSeriesFilters: ({ seriesId, series }: {
    seriesId: number;
    series: SeriesUrl;
}) => {
    invertFilter: ({ field, value, negate }: UpdateFilter) => void;
    setFilter: ({ field, value, negate, wildcards }: UpdateFilter) => void;
    removeFilter: ({ field, value, negate, isWildcard }: UpdateFilter) => void;
    replaceFilter: ({ field, values, notValues, wildcards, notWildcards, }: {
        field: string;
        values: Array<string | number>;
        notValues: Array<string | number>;
        wildcards?: string[];
        notWildcards?: string[];
    }) => void;
    setFiltersWildcard: ({ field, wildcards }: {
        field: string;
        wildcards: string[];
    }) => void;
};
