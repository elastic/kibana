import React from 'react';
import type { SeriesConfig, SeriesUrl } from '../../types';
interface Props {
    seriesId: number;
    seriesConfig: SeriesConfig;
    series: SeriesUrl;
}
export declare function URLSearch({ series, seriesConfig, seriesId }: Props): React.JSX.Element;
export {};
