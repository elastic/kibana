import React from 'react';
import type { ReportViewType, BuilderItem } from '../types';
import type { SeriesContextValue } from '../hooks/use_series_storage';
import type { DataViewState } from '../hooks/use_app_data_view';
import type { ReportConfigMap } from '../contexts/exploratory_view_config';
export interface ReportTypeItem {
    id: string;
    reportType: ReportViewType;
    label: string;
}
export declare const getSeriesToEdit: ({ dataViews, allSeries, reportType, reportConfigMap, }: {
    allSeries: SeriesContextValue["allSeries"];
    dataViews: DataViewState;
    reportType: ReportViewType;
    reportConfigMap: ReportConfigMap;
}) => BuilderItem[];
export declare const SeriesEditor: React.NamedExoticComponent<object>;
export declare const LOADING_VIEW: string;
export declare const SELECT_REPORT_TYPE: string;
export declare const REPORT_TYPE_LABEL: string;
export declare const REPORT_TYPE_ARIA_LABEL: string;
