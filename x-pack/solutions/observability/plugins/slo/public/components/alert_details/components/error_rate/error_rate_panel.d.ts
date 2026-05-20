import type { GetSLOResponse } from '@kbn/slo-schema';
import React from 'react';
import type { BurnRateAlert } from '../../types';
interface Props {
    alert: BurnRateAlert;
    slo?: GetSLOResponse;
    isLoading: boolean;
}
export declare function ErrorRatePanel({ alert, slo, isLoading }: Props): React.JSX.Element | null;
export {};
