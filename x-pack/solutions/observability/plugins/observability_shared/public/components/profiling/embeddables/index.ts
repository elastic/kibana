/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Profiling flamegraph embeddable key */
export const EMBEDDABLE_FLAMEGRAPH = 'EMBEDDABLE_FLAMEGRAPH';
/** Profiling flamegraph embeddable */
export { EmbeddableFlamegraph } from './embeddable_flamegraph';

/** Profiling functions embeddable key */
export const EMBEDDABLE_FUNCTIONS = 'EMBEDDABLE_FUNCTIONS';
/** Profiling functions embeddable */
export { EmbeddableFunctions } from './embeddable_functions';

/** Profiling threads embeddable key */
export const EMBEDDABLE_STACK_TRACES = 'EMBEDDABLE_STACK_TRACES';
export { EmbeddableStackTraces } from './embeddable_stack_traces';

/** Profiling search bar embeddable key */
export const EMBEDDABLE_PROFILING_SEARCH_BAR = 'EMBEDDABLE_PROFILING_SEARCH_BAR';
/** Profiling search bar embeddable */
export {
  EmbeddableProfilingSearchBar,
  type EmbeddableProfilingSearchBarProps,
} from './embeddable_profiling_search_bar';
