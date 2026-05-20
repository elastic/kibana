import React from 'react';
import type { SeriesUrl } from '../../../../..';
import type { SeriesConfig } from '../../types';
interface Props {
    seriesId: number;
    series: SeriesUrl;
    seriesConfig: SeriesConfig;
}
export declare function SeriesChartTypes({ seriesId, series, seriesConfig }: Props): React.JSX.Element;
export {};
