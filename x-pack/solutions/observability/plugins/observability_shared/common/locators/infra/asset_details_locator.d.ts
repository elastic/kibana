import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';
import { type AlertStatus } from '@kbn/rule-data-utils';
import type { DataSchemaFormat } from './hosts_locator';
export declare enum SupportedEntityTypes {
    container = "container",
    host = "host"
}
export type AssetDetailsLocator = LocatorPublic<AssetDetailsLocatorParams>;
export interface AssetDetailsLocatorParams extends SerializableRecord {
    entityType: string;
    entityId: string;
    _a?: {
        time?: {
            from?: string;
            to?: string;
        };
        interval?: string;
    };
    assetDetails?: {
        tabId?: string;
        name?: string;
        dashboardId?: string;
        dateRange?: {
            from: string;
            to: string;
        };
        alertMetric?: string;
        processSearch?: string;
        metadataSearch?: string;
        logsSearch?: string;
        profilingSearch?: string;
        alertStatus?: AlertStatus | 'all';
        preferredSchema?: DataSchemaFormat;
    };
}
export declare const ASSET_DETAILS_LOCATOR_ID = "ASSET_DETAILS_LOCATOR";
export declare class AssetDetailsLocatorDefinition implements LocatorDefinition<AssetDetailsLocatorParams> {
    readonly id = "ASSET_DETAILS_LOCATOR";
    readonly getLocation: (params: AssetDetailsLocatorParams & {
        state?: SerializableRecord;
    }) => Promise<{
        app: string;
        path: string;
        state: SerializableRecord;
    }>;
}
