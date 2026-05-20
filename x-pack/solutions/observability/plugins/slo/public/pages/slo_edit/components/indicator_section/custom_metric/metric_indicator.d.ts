import type { DataView, FieldSpec } from '@kbn/data-views-plugin/common';
import React from 'react';
interface MetricIndicatorProps {
    type: 'good' | 'total';
    metricFields: FieldSpec[];
    isLoadingIndex: boolean;
    dataView?: DataView;
}
export declare const NEW_CUSTOM_METRIC: {
    name: string;
    aggregation: "sum";
    field: string;
};
export declare function MetricIndicator({ type, metricFields, isLoadingIndex, dataView, }: MetricIndicatorProps): React.JSX.Element;
export {};
