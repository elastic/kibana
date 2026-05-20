import React from 'react';
import type { SeriesConfig, SeriesUrl } from '../types';
interface Props {
    seriesId: number;
    series: SeriesUrl;
    seriesConfig?: SeriesConfig;
}
export declare function ExpandedSeriesRow(seriesProps: Props): React.JSX.Element | null;
export {};
