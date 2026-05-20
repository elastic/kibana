import type { EmbeddableProfilingSearchBarProps } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import type { ProfilingEmbeddablesDependencies } from '../profiling_embeddable_provider';
export type EmbeddableSearchBarProps = EmbeddableProfilingSearchBarProps & ProfilingEmbeddablesDependencies;
export type EmbeddableSearchBarSharedComponent = React.FC<EmbeddableSearchBarProps>;
export declare function EmbeddableSearchBar({ showDatePicker, kuery, onQuerySubmit, onRefresh, rangeFrom, rangeTo, ...deps }: EmbeddableSearchBarProps): React.JSX.Element;
