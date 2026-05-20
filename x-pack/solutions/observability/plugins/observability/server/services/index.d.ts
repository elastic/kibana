import * as t from 'io-ts';
import type { IScopedClusterClient, IUiSettingsClient, KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
export declare const alertDetailsContextRt: t.IntersectionC<[t.TypeC<{
    alert_started_at: t.StringC;
}>, t.PartialC<{
    alert_rule_parameter_time_size: t.StringC;
    alert_rule_parameter_time_unit: t.StringC;
    'service.name': t.StringC;
    'service.environment': t.StringC;
    'transaction.type': t.StringC;
    'transaction.name': t.StringC;
    'host.name': t.StringC;
    'container.id': t.StringC;
    'kubernetes.pod.name': t.StringC;
}>]>;
export type AlertDetailsContextualInsightsHandlerQuery = t.TypeOf<typeof alertDetailsContextRt>;
export interface AlertDetailsContextualInsight {
    key: string;
    description: string;
    data: unknown;
}
export interface AlertDetailsContextualInsightsRequestContext {
    request: KibanaRequest;
    core: Promise<{
        elasticsearch: {
            client: IScopedClusterClient;
        };
        uiSettings: {
            client: IUiSettingsClient;
            globalClient: IUiSettingsClient;
        };
        savedObjects: {
            client: SavedObjectsClientContract;
        };
    }>;
    licensing: Promise<LicensingApiRequestHandlerContext>;
}
export type AlertDetailsContextualInsightsHandler = (context: AlertDetailsContextualInsightsRequestContext, query: AlertDetailsContextualInsightsHandlerQuery) => Promise<AlertDetailsContextualInsight[]>;
export declare class AlertDetailsContextualInsightsService {
    private handlers;
    constructor();
    registerHandler(handler: AlertDetailsContextualInsightsHandler): void;
    getAlertDetailsContext(context: AlertDetailsContextualInsightsRequestContext, query: AlertDetailsContextualInsightsHandlerQuery): Promise<AlertDetailsContextualInsight[]>;
}
