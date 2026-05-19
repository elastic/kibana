import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';
import type { Filter } from '@kbn/es-query';
export type HostsLocator = LocatorPublic<HostsLocatorParams>;
export type DataSchemaFormat = 'ecs' | 'semconv';
export interface HostsLocatorParams extends SerializableRecord {
    query?: {
        language: string;
        query: string;
    };
    dateRange?: {
        from: string;
        to: string;
    };
    filters?: Filter[];
    panelFilters?: Filter[];
    limit?: number;
    preferredSchema?: DataSchemaFormat | null;
    tableProperties?: {
        detailsItemId?: string;
        pagination: {
            pageIndex: number;
            pageSize: number;
        };
        sorting: {
            direction?: string;
            field: string;
        };
    };
}
export declare const HOSTS_LOCATOR_ID = "HOSTS_LOCATOR";
export declare class HostsLocatorDefinition implements LocatorDefinition<HostsLocatorParams> {
    readonly id = "HOSTS_LOCATOR";
    readonly getLocation: (params: HostsLocatorParams) => Promise<{
        app: string;
        path: string;
        state: {};
    }>;
}
