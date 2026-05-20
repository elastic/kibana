import React from 'react';
import type { SeriesConfig, SeriesUrl } from '../../types';
interface Props {
    seriesId: number;
    seriesConfig: SeriesConfig;
    series: SeriesUrl;
}
export interface Field {
    label: string;
    field: string;
    nestedField?: string;
    isNegated?: boolean;
}
export declare function SeriesFilter({ series, seriesConfig, seriesId }: Props): React.JSX.Element;
export {};
