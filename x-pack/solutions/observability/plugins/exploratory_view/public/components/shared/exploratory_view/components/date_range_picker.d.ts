import React from 'react';
import type { Moment } from 'moment';
import type { SeriesUrl } from '../types';
export declare const parseRelativeDate: (date: string, options?: {}) => Moment | void;
export declare function DateRangePicker({ seriesId, series }: {
    seriesId: number;
    series: SeriesUrl;
}): React.JSX.Element;
