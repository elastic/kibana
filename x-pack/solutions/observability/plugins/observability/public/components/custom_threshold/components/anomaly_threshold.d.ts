import React from 'react';
import type { PartialTheme, Theme } from '@elastic/charts';
export interface AnomalyThresholdProps {
    chartProps: {
        theme?: PartialTheme[];
        baseTheme: Theme;
    };
    id: string;
    severity: string;
    severityThreshold: string;
}
export declare function AnomalyThreshold({ chartProps: { theme, baseTheme }, id, severity, severityThreshold, }: AnomalyThresholdProps): React.JSX.Element;
