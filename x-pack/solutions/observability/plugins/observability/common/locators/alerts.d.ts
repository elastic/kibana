import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import type { AlertStatus } from '../typings';
export type AlertsLocator = LocatorPublic<AlertsLocatorParams>;
export interface AlertsLocatorParams extends SerializableRecord {
    baseUrl: string;
    spaceId: string;
    rangeFrom?: string;
    rangeTo?: string;
    kuery?: string;
    status?: AlertStatus;
}
export declare const ALERTS_PATH = "/app/observability/alerts";
export declare class AlertsLocatorDefinition implements LocatorDefinition<AlertsLocatorParams> {
    readonly id = "ALERTS_LOCATOR";
    readonly getLocation: ({ baseUrl, spaceId, kuery, rangeTo, rangeFrom, status, }: AlertsLocatorParams) => Promise<{
        app: string;
        path: string;
        state: {};
    }>;
}
