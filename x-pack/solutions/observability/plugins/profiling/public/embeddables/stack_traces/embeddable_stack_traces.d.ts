import React from 'react';
import type { ProfilingEmbeddablesDependencies } from '../profiling_embeddable_provider';
import type { StackTracesProps } from './stack_traces';
export type EmbeddableStackTracesProps = StackTracesProps & ProfilingEmbeddablesDependencies;
export type EmbeddableStackTracesSharedComponent = React.FC<StackTracesProps>;
export declare function EmbeddableStackTraces({ type, kuery, rangeFrom, rangeTo, onClick, onChartBrushEnd, ...deps }: EmbeddableStackTracesProps): React.JSX.Element;
