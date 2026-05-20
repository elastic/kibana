import React from 'react';
import type { SeriesConfig, SeriesUrl } from '../../types';
export interface FilterProps {
    seriesId: number;
    series: SeriesUrl;
    label: string;
    field: string;
    isNegated?: boolean;
    nestedField?: string;
    baseFilters: SeriesConfig['baseFilters'];
}
export interface NestedFilterOpen {
    value: string;
    negate: boolean;
}
export declare function FilterExpanded(props: FilterProps): React.JSX.Element;
