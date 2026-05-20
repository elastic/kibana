import type { DataView, FieldSpec } from '@kbn/data-views-plugin/common';
import React from 'react';
interface HistogramIndicatorProps {
    type: 'good' | 'total';
    histogramFields: FieldSpec[];
    isLoadingIndex: boolean;
    dataView?: DataView;
}
export declare function HistogramIndicator({ type, histogramFields, isLoadingIndex, dataView, }: HistogramIndicatorProps): React.JSX.Element;
export {};
