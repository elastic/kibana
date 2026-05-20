import React from 'react';
import type { SeriesUrl } from '../../types';
import type { NestedFilterOpen } from './filter_expanded';
interface Props {
    value: string;
    field: string;
    allSelectedValues?: Array<string | number>;
    negate: boolean;
    nestedField?: string;
    seriesId: number;
    series: SeriesUrl;
    isNestedOpen: {
        value: string;
        negate: boolean;
    };
    setIsNestedOpen: (val: NestedFilterOpen) => void;
}
export declare function FilterValueButton({ isNestedOpen, setIsNestedOpen, value, field, negate, seriesId, series, nestedField, allSelectedValues, }: Props): React.JSX.Element;
export {};
