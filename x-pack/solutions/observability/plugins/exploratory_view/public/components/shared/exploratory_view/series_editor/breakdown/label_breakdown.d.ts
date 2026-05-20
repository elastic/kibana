import React from 'react';
import type { SeriesConfig, SeriesUrl } from '../../types';
interface Props {
    seriesId: number;
    series: SeriesUrl;
    seriesConfig?: SeriesConfig;
}
export declare function LabelsBreakdown({ series, seriesId }: Props): React.JSX.Element | null;
export declare const CHOOSE_BREAKDOWN_FIELD: string;
export {};
