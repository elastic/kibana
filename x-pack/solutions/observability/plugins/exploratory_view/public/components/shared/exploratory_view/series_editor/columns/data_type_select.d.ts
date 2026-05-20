import React from 'react';
import type { SeriesUrl } from '../../types';
interface Props {
    seriesId: number;
    series: Omit<SeriesUrl, 'dataType'> & {
        dataType?: SeriesUrl['dataType'];
    };
}
export declare function DataTypesSelect({ seriesId, series }: Props): React.JSX.Element;
export {};
