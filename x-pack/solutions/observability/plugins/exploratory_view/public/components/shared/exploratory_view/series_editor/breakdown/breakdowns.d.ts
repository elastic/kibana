import React from 'react';
import type { SeriesConfig, SeriesUrl } from '../../types';
interface Props {
    seriesId: number;
    series: SeriesUrl;
    seriesConfig?: SeriesConfig;
}
export declare function Breakdowns({ seriesConfig, seriesId, series }: Props): React.JSX.Element | null;
export declare const NO_BREAK_DOWN_LABEL: string;
export declare const BREAKDOWN_WARNING: string;
export declare const BREAKDOWN_UNAVAILABLE: string;
export {};
