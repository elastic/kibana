import type { GetSLOResponse } from '@kbn/slo-schema';
import React from 'react';
import type { BurnRateAlert, BurnRateRule } from '../../types';
interface Props {
    alert: BurnRateAlert;
    rule: BurnRateRule;
    slo?: GetSLOResponse;
}
export declare function CustomAlertDetailsPanel({ slo, alert, rule }: Props): React.JSX.Element | null;
export {};
