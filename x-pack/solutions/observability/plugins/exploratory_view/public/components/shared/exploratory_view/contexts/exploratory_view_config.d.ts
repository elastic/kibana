import React from 'react';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { AppDataType, ConfigProps, ReportViewType, SeriesConfig } from '../types';
export type ReportConfigMap = Record<string, Array<(config: ConfigProps) => SeriesConfig>>;
type StartServices = Pick<CoreStart, 'analytics' | 'i18n' | 'theme'>;
interface ExploratoryViewContextValue extends StartServices {
    dataTypes: Array<{
        id: AppDataType;
        label: string;
    }>;
    reportTypes: Array<{
        reportType: ReportViewType | typeof SELECT_REPORT_TYPE;
        label: string;
    }>;
    reportConfigMap: ReportConfigMap;
    asPanel?: boolean;
    setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
    theme$: AppMountParameters['theme$'];
    isEditMode?: boolean;
    setIsEditMode?: React.Dispatch<React.SetStateAction<boolean>>;
}
export declare const ExploratoryViewContext: React.Context<ExploratoryViewContextValue>;
export declare function ExploratoryViewContextProvider({ children, reportTypes, dataTypes, reportConfigMap, setHeaderActionMenu, asPanel, theme$, ...startServices }: {
    children: JSX.Element;
} & ExploratoryViewContextValue): React.JSX.Element;
export declare function useExploratoryView(): ExploratoryViewContextValue;
export declare const SELECT_REPORT_TYPE: string;
export {};
