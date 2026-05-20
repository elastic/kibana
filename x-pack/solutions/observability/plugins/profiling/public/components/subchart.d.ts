import type { EuiFlexGroupProps } from '@elastic/eui';
import type { StackFrameMetadata } from '@kbn/profiling-utils';
import React from 'react';
import type { CountPerTime, TopNSample } from '../../common/topn';
export interface SubChartProps {
    index: number;
    color: string;
    height: number;
    width?: number;
    category: string;
    label: string;
    percentage: number;
    data: CountPerTime[];
    showAxes: boolean;
    metadata?: StackFrameMetadata[];
    onClick?: () => void;
    style?: EuiFlexGroupProps['style'];
    showFrames: boolean;
    padTitle: boolean;
    sample: TopNSample | null;
}
export declare function SubChart({ index, color, category, label, percentage, height, data, width, showAxes, metadata, onClick, style, showFrames, padTitle, sample, }: SubChartProps): React.JSX.Element;
