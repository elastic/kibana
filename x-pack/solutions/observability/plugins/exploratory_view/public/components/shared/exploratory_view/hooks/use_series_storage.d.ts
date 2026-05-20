import React from 'react';
import type { IKbnUrlStateStorage, ISessionStorageStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { OperationType, SeriesType } from '@kbn/lens-plugin/public';
import type { ChartTimeRange } from '../header/last_updated';
import type { AppDataType, ReportViewType, SeriesUrl, UrlFilter, URLReportDefinition } from '../types';
import type { URL_KEYS } from '../configurations/constants/url_constants';
export interface SeriesContextValue {
    firstSeries?: SeriesUrl;
    lastRefresh: number;
    setLastRefresh: (val: number) => void;
    applyChanges: (onApply?: () => void) => void;
    allSeries: AllSeries;
    setSeries: (seriesIndex: number, newValue: SeriesUrl) => void;
    getSeries: (seriesIndex: number) => SeriesUrl | undefined;
    removeSeries: (seriesIndex: number) => void;
    setReportType: (reportType: ReportViewType) => void;
    storage: IKbnUrlStateStorage | ISessionStorageStateStorage;
    reportType: ReportViewType;
    chartTimeRangeContext?: ChartTimeRange;
    setChartTimeRangeContext: React.Dispatch<React.SetStateAction<ChartTimeRange | undefined>>;
}
export declare const UrlStorageContext: React.Context<SeriesContextValue>;
interface ProviderProps {
    storage: IKbnUrlStateStorage | ISessionStorageStateStorage;
}
export declare function convertAllShortSeries(allShortSeries: AllShortSeries): SeriesUrl[];
export declare const allSeriesKey = "sr";
export declare const reportTypeKey = "reportType";
export declare function UrlStorageContextProvider({ children, storage, }: ProviderProps & {
    children: JSX.Element;
}): React.JSX.Element;
export declare function useSeriesStorage(): SeriesContextValue;
interface ShortUrlSeries {
    [URL_KEYS.OPERATION_TYPE]?: OperationType;
    [URL_KEYS.DATA_TYPE]?: AppDataType;
    [URL_KEYS.SERIES_TYPE]?: SeriesType;
    [URL_KEYS.BREAK_DOWN]?: string;
    [URL_KEYS.FILTERS]?: UrlFilter[];
    [URL_KEYS.REPORT_DEFINITIONS]?: URLReportDefinition;
    [URL_KEYS.SELECTED_METRIC]?: string;
    [URL_KEYS.HIDDEN]?: boolean;
    [URL_KEYS.NAME]: string;
    [URL_KEYS.COLOR]?: string;
    [URL_KEYS.SHOW_PERCENTILE_ANNOTATIONS]?: boolean;
    time?: {
        to: string;
        from: string;
    };
}
export type AllShortSeries = ShortUrlSeries[];
export type AllSeries = SeriesUrl[];
export declare const NEW_SERIES_KEY = "new-series";
export {};
