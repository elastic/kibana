import React from 'react';
import type { PartialTheme, Theme, ValueFormatter } from '@elastic/charts';
import type { COMPARATORS } from '@kbn/alerting-comparators';
export interface ChartProps {
    theme?: PartialTheme[];
    baseTheme: Theme;
}
export interface Props {
    chartProps: ChartProps;
    comparator: COMPARATORS | string;
    id: string;
    threshold: number[];
    title: string;
    value: number;
    valueFormatter?: ValueFormatter;
}
export declare function Threshold({ chartProps: { theme, baseTheme }, comparator, id, threshold, title, value, valueFormatter, }: Props): React.JSX.Element;
