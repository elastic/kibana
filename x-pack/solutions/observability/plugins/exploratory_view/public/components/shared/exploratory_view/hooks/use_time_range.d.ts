import type { ReportViewType, SeriesUrl } from '../types';
export declare const combineTimeRanges: (reportType: ReportViewType, allSeries: SeriesUrl[], firstSeries?: SeriesUrl) => {
    to: string;
    from: string;
} | undefined;
export declare const useExpViewTimeRange: () => {
    to: string;
    from: string;
} | undefined;
