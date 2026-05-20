import type { TopNType } from '@kbn/profiling-utils';
import React from 'react';
export interface StackTracesProps {
    type: TopNType;
    kuery: string;
    rangeFrom: number;
    rangeTo: number;
    onClick: (category: string) => void;
    onChartBrushEnd: (range: {
        rangeFrom: string;
        rangeTo: string;
    }) => void;
}
export declare function StackTraces({ type, kuery, rangeFrom, rangeTo, onClick, onChartBrushEnd, }: StackTracesProps): React.JSX.Element;
