import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { SeriesUrl } from '../types';
interface Props {
    field: string;
    label: string;
    value: string | Array<string | number>;
    seriesId: number;
    series: SeriesUrl;
    negate: boolean;
    definitionFilter?: boolean;
    dataView: DataView;
    removeFilter: (field: string, value: string | Array<string | number>, notVal: boolean) => void;
}
export declare function FilterLabel({ label, seriesId, series, field, value, negate, dataView, removeFilter, definitionFilter, }: Props): React.JSX.Element | null;
export {};
