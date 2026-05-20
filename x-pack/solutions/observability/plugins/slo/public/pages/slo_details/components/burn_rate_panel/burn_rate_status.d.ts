import React from 'react';
import type { BurnRateWindow } from '../../hooks/use_fetch_burn_rate_windows';
export interface BurnRateParams {
    isLoading: boolean;
    selectedWindow: BurnRateWindow;
    longWindowBurnRate: number;
    shortWindowBurnRate: number;
}
export type Status = 'BREACHED' | 'RECOVERING' | 'INCREASING' | 'ACCEPTABLE';
export declare function BurnRateStatus({ selectedWindow, longWindowBurnRate, shortWindowBurnRate, isLoading, }: BurnRateParams): React.JSX.Element;
