import React from 'react';
import type { NumberOrNull } from '../../../../..';
interface Props {
    id: string;
    value: NumberOrNull;
    timeseries: any[];
    formatter: (value: NumberOrNull) => string;
    color: string;
}
export declare function MetricWithSparkline({ id, formatter, value, timeseries, color }: Props): React.JSX.Element;
export {};
