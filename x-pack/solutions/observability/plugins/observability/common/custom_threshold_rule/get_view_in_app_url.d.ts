import type { TimeRange } from '@kbn/es-query';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { SearchConfigurationWithExtractedReferenceType } from './types';
import type { CustomThresholdExpressionMetric } from './types';
import type { Group } from '../typings';
export interface GetViewInAppUrlArgs {
    searchConfiguration?: SearchConfigurationWithExtractedReferenceType;
    dataViewId?: string;
    endedAt?: string;
    groups?: Group[];
    logsLocator?: LocatorPublic<DiscoverAppLocatorParams>;
    metrics?: CustomThresholdExpressionMetric[];
    startedAt?: string;
    spaceId?: string;
}
export declare const getViewInAppLocatorParams: ({ dataViewId, endedAt, groups, metrics, searchConfiguration, startedAt, }: GetViewInAppUrlArgs) => {
    dataViewId: string | undefined;
    dataViewSpec: DataViewSpec | undefined;
    timeRange: TimeRange;
    query: {
        query: string;
        language: string;
    };
    filters: import("@kbn/es-query").Filter[];
};
export declare const getViewInAppUrl: ({ dataViewId, endedAt, groups, logsLocator, metrics, searchConfiguration, startedAt, spaceId, }: GetViewInAppUrlArgs) => string;
