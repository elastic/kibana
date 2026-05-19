import type { ActionGroup } from '@kbn/alerting-plugin/common';
export type MonitorStatusActionGroup = ActionGroup<'xpack.synthetics.alerts.actionGroups.monitorStatus'> | ActionGroup<'xpack.synthetics.alerts.actionGroups.tls'>;
export declare const MONITOR_STATUS: MonitorStatusActionGroup;
export declare const TLS_CERTIFICATE: MonitorStatusActionGroup;
export declare const ACTION_GROUP_DEFINITIONS: {
    MONITOR_STATUS: MonitorStatusActionGroup;
    TLS_CERTIFICATE: MonitorStatusActionGroup;
};
export declare const SYNTHETICS_STATUS_RULE = "xpack.synthetics.alerts.monitorStatus";
export declare const SYNTHETICS_TLS_RULE = "xpack.synthetics.alerts.tls";
export declare const SYNTHETICS_ALERT_RULE_TYPES: {
    MONITOR_STATUS: string;
    TLS: string;
};
export declare const SYNTHETICS_RULE_TYPES_ALERT_CONTEXT = "observability.uptime";
