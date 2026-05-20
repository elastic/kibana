import React from 'react';
import type { ReportViewType, SeriesUrl } from '../types';
export declare function EmptyView({ loading, series, reportType, }: {
    loading: boolean;
    series?: SeriesUrl;
    reportType: ReportViewType;
}): React.JSX.Element;
export declare const EMPTY_LABEL: string;
export declare const CHOOSE_REPORT_DEFINITION: string;
export declare const SELECT_REPORT_TYPE_BELOW: string;
