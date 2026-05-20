import type { DataView } from '@kbn/data-views-plugin/common';
import type { AppDataType, ReportViewType, SeriesConfig } from '../types';
import type { ReportConfigMap } from '../contexts/exploratory_view_config';
interface Props {
    reportType: ReportViewType;
    dataView: DataView;
    dataType: AppDataType;
    reportConfigMap: ReportConfigMap;
    spaceId?: string;
}
export declare const getDefaultConfigs: ({ reportType, dataType, spaceId, dataView, reportConfigMap, }: Props) => SeriesConfig;
export {};
