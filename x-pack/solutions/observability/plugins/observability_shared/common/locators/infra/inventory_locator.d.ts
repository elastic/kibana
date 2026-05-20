import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';
import type { DataSchemaFormat } from './hosts_locator';
export type InventoryLocator = LocatorPublic<InventoryLocatorParams>;
export interface InventoryLocatorParams extends SerializableRecord {
    inventoryViewId?: string;
    waffleFilter?: {
        expression: string;
        kind: string;
    };
    waffleTime?: {
        currentTime: number;
        isAutoReloading: boolean;
    };
    waffleOptions?: {
        accountId: string;
        autoBounds: boolean;
        boundsOverride: {
            max: number;
            min: number;
        };
    };
    customMetrics?: string;
    customOptions?: string;
    groupBy?: {
        field: string;
    };
    legend?: {
        palette: string;
        reverseColors: boolean;
        steps: number;
    };
    metric: string;
    nodeType: string;
    region?: string;
    preferredSchema?: DataSchemaFormat | null;
    sort?: {
        by: string;
        direction: 'desc' | 'async';
    };
    timelineOpen?: boolean;
    view?: 'map' | 'table';
    state?: SerializableRecord;
}
export declare const INVENTORY_LOCATOR_ID = "INVENTORY_LOCATOR";
export declare class InventoryLocatorDefinition implements LocatorDefinition<InventoryLocatorParams> {
    readonly id = "INVENTORY_LOCATOR";
    readonly getLocation: (params: InventoryLocatorParams) => Promise<{
        app: string;
        path: string;
        state: SerializableRecord;
    }>;
}
