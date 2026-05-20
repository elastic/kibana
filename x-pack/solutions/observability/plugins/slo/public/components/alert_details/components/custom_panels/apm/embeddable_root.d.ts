import React from 'react';
import type { GetSLOResponse, APMTransactionDurationIndicator, APMTransactionErrorRateIndicator } from '@kbn/slo-schema';
import type { APM_ALERTING_FAILED_TRANSACTIONS_CHART_EMBEDDABLE, APM_ALERTING_LATENCY_CHART_EMBEDDABLE, APM_ALERTING_THROUGHPUT_CHART_EMBEDDABLE } from '@kbn/apm-embeddable-common';
import type { BurnRateAlert, BurnRateRule, TimeRange } from '../../../types';
type EmbeddableId = typeof APM_ALERTING_FAILED_TRANSACTIONS_CHART_EMBEDDABLE | typeof APM_ALERTING_LATENCY_CHART_EMBEDDABLE | typeof APM_ALERTING_THROUGHPUT_CHART_EMBEDDABLE;
export type APMTransactionDurationSLOResponse = GetSLOResponse & {
    indicator: APMTransactionDurationIndicator;
};
export type APMErrorRateSLOResponse = GetSLOResponse & {
    indicator: APMTransactionErrorRateIndicator;
};
interface APMEmbeddableRootProps {
    slo: APMTransactionDurationSLOResponse | APMErrorRateSLOResponse;
    dataTimeRange: TimeRange;
    embeddableId: EmbeddableId;
    alert: BurnRateAlert;
    rule: BurnRateRule;
}
export declare function APMEmbeddableRoot({ slo, dataTimeRange, embeddableId, alert, rule, }: APMEmbeddableRootProps): React.JSX.Element | null;
export {};
