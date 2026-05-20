import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';
export declare const APM_APP_LOCATOR_ID = "APM_LOCATOR";
export declare const getApmAppLocator: (baseLocator?: LocatorPublic<SerializableRecord>) => {
    getRedirectUrl: (params: SerializableRecord) => string;
    navigate: (params: SerializableRecord) => Promise<void>;
    id: string;
    getLocation(params: SerializableRecord): Promise<import("@kbn/share-plugin/public").KibanaLocation>;
    getUrl(params: SerializableRecord, getUrlParams?: import("@kbn/share-plugin/common/url_service").LocatorGetUrlParams): Promise<string>;
    navigateSync(params: SerializableRecord, navigationParams?: import("@kbn/share-plugin/common/url_service").LocatorNavigationParams): void;
    useUrl: (params: SerializableRecord, getUrlParams?: import("@kbn/share-plugin/common/url_service").LocatorGetUrlParams, deps?: import("react").DependencyList) => string;
    telemetry: (state: SerializableRecord, stats: Record<string, any>) => Record<string, any>;
    inject: (state: SerializableRecord, references: import("@kbn/core/public").SavedObjectReference[]) => SerializableRecord;
    extract: (state: SerializableRecord) => {
        state: SerializableRecord;
        references: import("@kbn/core/public").SavedObjectReference[];
    };
    migrations: import("@kbn/kibana-utils-plugin/common").MigrateFunctionsObject | import("@kbn/kibana-utils-plugin/common").GetMigrationFunctionObjectFn;
} | undefined;
