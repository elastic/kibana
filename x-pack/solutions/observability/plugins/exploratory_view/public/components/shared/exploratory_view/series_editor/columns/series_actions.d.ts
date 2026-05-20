import React from 'react';
import type { SeriesConfig, SeriesUrl } from '../../types';
interface Props {
    seriesId: number;
    series: SeriesUrl;
    seriesConfig?: SeriesConfig;
    onEditClick?: () => void;
}
export declare function SeriesActions({ seriesId, series, seriesConfig, onEditClick }: Props): React.JSX.Element;
export {};
