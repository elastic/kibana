import * as React from 'react';
import { getAlertsKPIConfig } from './configurations/alerts_configs/kpi_over_time_config';
import type { AppDataType, ReportViewType } from './types';
import type { SELECT_REPORT_TYPE } from './series_editor/series_editor';
import { getKPITrendsLensConfig } from './configurations/rum/kpi_over_time_config';
import { getSyntheticsKPIConfig } from './configurations/synthetics/kpi_over_time_config';
import { getMobileKPIConfig } from './configurations/mobile/kpi_over_time_config';
import { getLogsKPIConfig } from './configurations/infra_logs/kpi_over_time_config';
import type { StartServices } from '../../../application';
export declare const dataTypes: Array<{
    id: AppDataType;
    label: string;
}>;
export declare const reportTypesList: Array<{
    reportType: ReportViewType | typeof SELECT_REPORT_TYPE;
    label: string;
}>;
export declare const obsvReportConfigMap: {
    ux: (typeof getKPITrendsLensConfig)[];
    synthetics: (typeof getSyntheticsKPIConfig)[];
    uptime: (typeof getSyntheticsKPIConfig)[];
    mobile: (typeof getMobileKPIConfig)[];
    infra_logs: (typeof getLogsKPIConfig)[];
    alerts: (typeof getAlertsKPIConfig)[];
};
export declare function ObservabilityExploratoryView(props: {
    startServices: StartServices;
}): React.JSX.Element;
