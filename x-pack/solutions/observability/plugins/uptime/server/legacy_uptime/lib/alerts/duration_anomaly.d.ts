import type { ActionGroupIdsOf } from '@kbn/alerting-plugin/common';
import type { MlAnomaliesTableRecord } from '@kbn/ml-anomaly-utils';
import { DURATION_ANOMALY } from '../../../../common/constants/uptime_alerts';
import type { UptimeAlertTypeFactory } from './types';
import type { Ping } from '../../../../common/runtime_types/ping';
export type ActionGroupIds = ActionGroupIdsOf<typeof DURATION_ANOMALY>;
export declare const getAnomalySummary: (anomaly: MlAnomaliesTableRecord, monitorInfo: Ping) => {
    severity: import("@kbn/ml-anomaly-utils").ML_ANOMALY_SEVERITY;
    severityScore: number;
    anomalyStartTimestamp: string;
    monitor: any;
    monitorUrl: string | undefined;
    slowestAnomalyResponse: string;
    expectedResponseTime: string;
    observerLocation: any;
    bucketSpan: number;
};
export declare const durationAnomalyAlertFactory: UptimeAlertTypeFactory<ActionGroupIds>;
