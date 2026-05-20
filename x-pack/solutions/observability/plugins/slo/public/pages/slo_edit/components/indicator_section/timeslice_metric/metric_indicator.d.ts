import type { DataView, FieldSpec } from '@kbn/data-views-plugin/common';
import React from 'react';
interface MetricIndicatorProps {
    indexFields: FieldSpec[];
    isLoadingIndex: boolean;
    dataView?: DataView;
}
export declare const NEW_TIMESLICE_METRIC: {
    name: string;
    aggregation: "avg";
    field: string;
};
export declare function MetricIndicator({ indexFields, isLoadingIndex, dataView }: MetricIndicatorProps): React.JSX.Element;
export {};
