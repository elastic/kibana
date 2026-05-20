import React from 'react';
import { StackTracesDisplayOption, TopNType } from '@kbn/profiling-utils';
import type { StackedBarChartProps } from '../stacked_bar_chart';
import type { TopNSubchart } from '../../../common/topn';
import { type AsyncState } from '../../hooks/use_async';
interface Props {
    type: TopNType;
    state: AsyncState<{
        charts: TopNSubchart[];
    }>;
    displayOption: StackTracesDisplayOption;
    onChangeDisplayOption: (nextOption: StackTracesDisplayOption) => void;
    onStackedBarChartBrushEnd: StackedBarChartProps['onBrushEnd'];
    onChartClick: (category: string) => void;
    limit: number;
    onShowMoreClick?: (newLimit: number) => void;
}
export declare function StackTraces({ type, state, displayOption, onChangeDisplayOption, onStackedBarChartBrushEnd, limit, onShowMoreClick, onChartClick, }: Props): React.JSX.Element;
export {};
