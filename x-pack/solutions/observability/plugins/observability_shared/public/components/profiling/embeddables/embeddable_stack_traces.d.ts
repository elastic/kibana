import React from 'react';
import type { TopNType } from '@kbn/profiling-utils';
interface Props {
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
export declare function EmbeddableStackTraces(props: Props): React.JSX.Element;
export {};
