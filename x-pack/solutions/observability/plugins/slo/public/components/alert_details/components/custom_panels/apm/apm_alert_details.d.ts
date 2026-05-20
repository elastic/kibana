import React from 'react';
import type { APMTransactionDurationSLOResponse, APMErrorRateSLOResponse } from './embeddable_root';
import type { BurnRateRule, BurnRateAlert, TimeRange } from '../../../types';
interface APMAlertDetailsProps<IndicatorType> {
    slo: IndicatorType;
    alert: BurnRateAlert;
    rule: BurnRateRule;
    dataTimeRange: TimeRange;
}
export declare function APMLatencyAlertDetails({ slo, dataTimeRange, alert, rule, }: APMAlertDetailsProps<APMTransactionDurationSLOResponse>): React.JSX.Element;
export declare function APMAvailabilityAlertDetails({ slo, dataTimeRange, alert, rule, }: APMAlertDetailsProps<APMErrorRateSLOResponse>): React.JSX.Element;
export {};
