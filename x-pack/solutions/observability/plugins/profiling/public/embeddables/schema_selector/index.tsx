/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import type { EmbeddableSchemaSelectorSharedComponent } from './embeddable_schema_selector';
import type { ProfilingEmbeddablesDependencies } from '../profiling_embeddable_provider';

const LazyEmbeddableSchemaSelector = dynamic(async () => {
  const Component = await import('./embeddable_schema_selector');
  return { default: Component.EmbeddableSchemaSelector };
});

export const getEmbeddableSchemaSelectorComponent = (
  profilingEmbeddableDependencies: ProfilingEmbeddablesDependencies
): EmbeddableSchemaSelectorSharedComponent => {
  return (props) => {
    return <LazyEmbeddableSchemaSelector {...props} {...profilingEmbeddableDependencies} />;
  };
};
