import React from 'react';
import type { FilterProps } from '../columns/filter_expanded';
interface Props extends FilterProps {
    values: Array<{
        label: string;
        count: number;
    }>;
    field: string;
    query: string;
    loading?: boolean;
    setQuery: (q: string) => void;
}
export declare function FilterValuesList({ field, values, query, setQuery, label, loading, isNegated, nestedField, series, seriesId, }: Props): React.JSX.Element;
export {};
