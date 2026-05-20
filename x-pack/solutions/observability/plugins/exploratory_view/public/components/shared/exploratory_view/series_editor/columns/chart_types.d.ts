import React from 'react';
import type { SeriesType } from '@kbn/lens-plugin/public';
import type { SeriesUrl } from '../../../../..';
export declare function SeriesChartTypesSelect({ seriesId, series, defaultChartType, }: {
    seriesId: number;
    series: SeriesUrl;
    defaultChartType: SeriesType;
}): React.JSX.Element;
export interface XYChartTypesProps {
    label?: string;
    value: SeriesType;
    includeChartTypes?: SeriesType[];
    excludeChartTypes?: SeriesType[];
    onChange: (value: SeriesType) => void;
}
export declare function XYChartTypesSelect({ onChange, value, includeChartTypes, excludeChartTypes, }: XYChartTypesProps): React.JSX.Element;
