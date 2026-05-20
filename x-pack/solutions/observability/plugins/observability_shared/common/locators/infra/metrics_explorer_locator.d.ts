import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';
export type MetricsExplorerLocator = LocatorPublic<MetricsExplorerLocatorParams>;
export interface MetricsExplorerLocatorParams extends SerializableRecord {
}
export declare const METRICS_EXPLORER_LOCATOR_ID = "METRICS_EXPLORER_LOCATOR";
export declare class MetricsExplorerLocatorDefinition implements LocatorDefinition<MetricsExplorerLocatorParams> {
    readonly id = "METRICS_EXPLORER_LOCATOR";
    readonly getLocation: (params: MetricsExplorerLocatorParams) => Promise<{
        app: string;
        path: string;
        state: {};
    }>;
}
