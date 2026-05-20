import React from 'react';
import type { FETCH_STATUS } from '@kbn/observability-shared-plugin/public';
import type { ObservabilityFetchDataPlugins } from '../../typings/fetch_overview_data';
import type { ApmIndicesConfig } from '../../../common/typings';
export type DataContextApps = ObservabilityFetchDataPlugins | 'alert';
export type HasDataMap = Record<DataContextApps, {
    status: FETCH_STATUS;
    hasData?: boolean;
    indices?: string | ApmIndicesConfig;
    serviceName?: string;
}>;
export interface HasDataContextValue {
    hasDataMap: Partial<HasDataMap>;
    hasAnyData?: boolean;
    isAllRequestsComplete: boolean;
    onRefreshTimeRange: () => void;
    forceUpdate: string;
}
export declare const HasDataContext: React.Context<HasDataContextValue>;
export declare const appLabels: Record<DataContextApps, string>;
export declare function HasDataContextProvider({ children }: {
    children: React.ReactNode;
}): React.JSX.Element;
