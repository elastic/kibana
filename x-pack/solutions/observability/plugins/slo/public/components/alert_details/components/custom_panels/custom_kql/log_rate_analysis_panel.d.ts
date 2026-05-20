import type { GetSLOResponse } from '@kbn/slo-schema';
import React from 'react';
import type { BurnRateAlert, BurnRateRule } from '../../../types';
interface Props {
    slo: GetSLOResponse;
    alert: BurnRateAlert;
    rule: BurnRateRule;
}
export declare function LogRateAnalysisPanel({ slo, alert, rule }: Props): React.JSX.Element | null;
export {};
