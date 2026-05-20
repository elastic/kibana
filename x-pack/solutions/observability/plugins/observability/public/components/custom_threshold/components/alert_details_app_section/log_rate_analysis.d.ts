import React from 'react';
import type { CustomThresholdAlert } from '../types';
export interface AlertDetailsLogRateAnalysisProps {
    alert: CustomThresholdAlert;
    dataView: any;
    services: any;
}
export declare function LogRateAnalysis({ alert, dataView, services }: AlertDetailsLogRateAnalysisProps): React.JSX.Element | null;
