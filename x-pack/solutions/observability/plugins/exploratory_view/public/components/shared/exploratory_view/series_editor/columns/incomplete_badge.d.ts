import React from 'react';
import type { SeriesConfig, SeriesUrl } from '../../types';
interface Props {
    series: SeriesUrl;
    seriesConfig?: SeriesConfig;
}
export declare function IncompleteBadge({ seriesConfig, series }: Props): React.JSX.Element | null;
export {};
