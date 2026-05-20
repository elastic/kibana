import React from 'react';
import type { SeriesConfig, SeriesUrl } from '../types';
interface Props {
    seriesId: number;
    series: SeriesUrl;
    defaultValue?: string;
    seriesConfig?: SeriesConfig;
}
export declare function ReportMetricOptions({ seriesId, series, seriesConfig }: Props): React.JSX.Element | null;
export {};
