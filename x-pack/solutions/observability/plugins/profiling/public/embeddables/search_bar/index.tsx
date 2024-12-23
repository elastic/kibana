/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import type { EmbeddableSearchBarSharedComponent } from './embeddable_search_bar';
import { ProfilingEmbeddablesDependencies } from '../profiling_embeddable_provider';

const LazyEmbeddableSearchBar = dynamic(async () => {
  const Component = await import('./embeddable_search_bar');
  return { default: Component.EmbeddableSearchBar };
});

export const getEmbeddableSearchBarComponent = (
  profilingEmbeddableDependencies: ProfilingEmbeddablesDependencies
): EmbeddableSearchBarSharedComponent => {
  return (props) => {
    return <LazyEmbeddableSearchBar {...props} {...profilingEmbeddableDependencies} />;
  };
};
