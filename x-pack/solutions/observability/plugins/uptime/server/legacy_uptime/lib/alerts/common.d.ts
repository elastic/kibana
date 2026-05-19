import type { AlertsLocatorParams } from '@kbn/observability-plugin/common';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { ObservabilityUptimeAlert } from '@kbn/alerts-as-data-utils';
import type { IBasePath } from '@kbn/core/server';
import type { IRuleTypeAlerts } from '@kbn/alerting-plugin/server';
import type { RuleExecutorServices } from '@kbn/alerting-plugin/server';
import type { AlertInstanceState } from '@kbn/alerting-plugin/server';
import type { AlertInstanceContext } from '@kbn/alerting-plugin/server';
import type { UptimeCommonState } from '../../../../common/runtime_types';
export type UpdateUptimeAlertState = (state: Record<string, any>, isTriggeredNow: boolean) => UptimeCommonState;
export declare const updateState: UpdateUptimeAlertState;
export declare const generateAlertMessage: (messageTemplate: string, fields: Record<string, any>) => string;
export declare const getViewInAppUrl: (basePath: IBasePath, spaceId: string, relativeViewInAppUrl: string) => string;
export declare const getAlertDetailsUrl: (basePath: IBasePath, spaceId: string, alertUuid: string | null) => string;
export declare const setRecoveredAlertsContext: <ActionGroupIds extends string>({ alertsClient, alertsLocator, basePath, defaultStartedAt, spaceId, }: {
    alertsClient: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, ActionGroupIds, ObservabilityUptimeAlert>["alertsClient"];
    alertsLocator?: LocatorPublic<AlertsLocatorParams>;
    basePath: IBasePath;
    defaultStartedAt: string;
    spaceId: string;
}) => Promise<void>;
export declare const uptimeRuleTypeFieldMap: {
    "kibana.alert.evaluation.threshold": {
        readonly type: "scaled_float";
        readonly scaling_factor: 100;
        readonly required: false;
    };
    "kibana.alert.evaluation.time_range": {
        readonly type: "date_range";
        readonly array: false;
        readonly required: false;
    };
    "kibana.alert.evaluation.value": {
        readonly type: "scaled_float";
        readonly scaling_factor: 100;
        readonly required: false;
    };
    "kibana.alert.context": {
        readonly type: "object";
        readonly array: false;
        readonly required: false;
    };
    "kibana.alert.evaluation.values": {
        readonly type: "scaled_float";
        readonly scaling_factor: 100;
        readonly required: false;
        readonly array: true;
    };
    "kibana.alert.grouping": {
        readonly type: "object";
        readonly dynamic: true;
        readonly array: false;
        readonly required: false;
    };
    "kibana.alert.group": {
        readonly type: "object";
        readonly array: true;
        readonly required: false;
    };
    "kibana.alert.group.field": {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    "kibana.alert.group.value": {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
};
export declare const UptimeRuleTypeAlertDefinition: IRuleTypeAlerts<ObservabilityUptimeAlert>;
