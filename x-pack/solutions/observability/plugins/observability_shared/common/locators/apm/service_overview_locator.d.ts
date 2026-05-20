import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
export interface ServiceOverviewParams extends SerializableRecord {
    serviceName: string;
    environment?: string;
    rangeFrom?: string;
    rangeTo?: string;
}
export type ServiceOverviewLocator = LocatorPublic<ServiceOverviewParams>;
export declare const SERVICE_OVERVIEW_LOCATOR_ID = "serviceOverviewLocator";
export declare class ServiceOverviewLocatorDefinition implements LocatorDefinition<ServiceOverviewParams> {
    readonly id = "serviceOverviewLocator";
    readonly getLocation: ({ rangeFrom, rangeTo, serviceName, environment, }: ServiceOverviewParams) => Promise<{
        app: string;
        path: string;
        state: {};
    }>;
}
