import type { BaseFlameGraph } from '@kbn/profiling-utils';
import React from 'react';
import type { ProfilingEmbeddablesDependencies } from '../profiling_embeddable_provider';
export type EmbeddableFlamegraphProps = FlamegraphProps & ProfilingEmbeddablesDependencies;
export type EmbeddableFlamegraphSharedComponent = React.FC<FlamegraphProps>;
export interface FlamegraphProps {
    data?: BaseFlameGraph;
    isLoading: boolean;
}
export declare function EmbeddableFlamegraph({ data, isLoading, ...deps }: EmbeddableFlamegraphProps): React.JSX.Element;
