import React from 'react';
interface Data {
    key: number;
    value: number | undefined;
}
type ChartType = 'area' | 'line';
type State = 'success' | 'error';
export interface Props {
    id: string;
    data: Data[];
    chart: ChartType;
    state: State;
    size?: 'compact' | 'default';
    isLoading: boolean;
}
export declare function SloSparkline({ chart, data, id, isLoading, size, state }: Props): React.JSX.Element;
export {};
