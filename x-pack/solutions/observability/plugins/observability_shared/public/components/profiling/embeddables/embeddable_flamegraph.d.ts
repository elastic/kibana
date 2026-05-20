import React from 'react';
import type { BaseFlameGraph } from '@kbn/profiling-utils';
interface Props {
    data?: BaseFlameGraph;
    isLoading: boolean;
    height?: string;
}
export declare function EmbeddableFlamegraph({ height, ...props }: Props): React.JSX.Element;
export {};
