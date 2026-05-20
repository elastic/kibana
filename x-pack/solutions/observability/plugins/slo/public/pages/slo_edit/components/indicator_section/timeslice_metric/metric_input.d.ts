import type { FieldSpec } from '@kbn/data-views-plugin/common';
import React from 'react';
interface MetricInputProps {
    metricIndex: number;
    indexPattern: string;
    isLoadingIndex: boolean;
    indexFields: FieldSpec[];
}
export declare function MetricInput({ metricIndex: index, indexPattern, isLoadingIndex, indexFields, }: MetricInputProps): React.JSX.Element;
export {};
