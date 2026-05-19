import type { ActionGroup } from '@kbn/alerting-plugin/common';
export type MonitorStatusActionGroup = ActionGroup<'xpack.uptime.alerts.actionGroups.monitorStatus'>;
export type TLSLegacyActionGroup = ActionGroup<'xpack.uptime.alerts.actionGroups.tls'>;
export type TLSActionGroup = ActionGroup<'xpack.uptime.alerts.actionGroups.tlsCertificate'>;
export type DurationAnomalyActionGroup = ActionGroup<'xpack.uptime.alerts.actionGroups.durationAnomaly'>;
export declare const MONITOR_STATUS: MonitorStatusActionGroup;
export declare const TLS_LEGACY: TLSLegacyActionGroup;
export declare const TLS: TLSActionGroup;
export declare const DURATION_ANOMALY: DurationAnomalyActionGroup;
export declare const CLIENT_ALERT_TYPES: {
    MONITOR_STATUS: string;
    TLS_LEGACY: string;
    TLS: string;
    DURATION_ANOMALY: string;
};
export { UPTIME_RULE_TYPE_IDS as UPTIME_RULE_TYPES } from '@kbn/rule-data-utils';
