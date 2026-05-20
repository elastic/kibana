import React from 'react';
import type { TopNFunctions } from '@kbn/profiling-utils';
import type { ProfilingEmbeddablesDependencies } from '../profiling_embeddable_provider';
export type EmbeddableFunctionsProps = FunctionsProps & ProfilingEmbeddablesDependencies;
export type EmbeddableFunctionsSharedComponent = React.FC<FunctionsProps>;
export interface FunctionsProps {
    data?: TopNFunctions;
    isLoading: boolean;
    rangeFrom: number;
    rangeTo: number;
    showFullScreenSelector?: boolean;
}
export declare function EmbeddableFunctions({ data, isLoading, rangeFrom, rangeTo, showFullScreenSelector, ...deps }: EmbeddableFunctionsProps): React.JSX.Element;
