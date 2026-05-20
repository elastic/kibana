import React from 'react';
import type { SeriesConfig, SeriesUrl } from '../../types';
interface Props {
    seriesId: number;
    series: SeriesUrl;
    seriesConfig?: SeriesConfig;
}
export declare function SeriesInfo({ seriesId, series, seriesConfig }: Props): React.JSX.Element | null;
export {};
