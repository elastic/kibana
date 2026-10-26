/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ProfilingSchema } from '@kbn/profiling-utils';
import { EMBEDDABLE_PROFILING_SCHEMA_SELECTOR } from '.';
import { getProfilingComponent } from '../helpers/component_registry';

export interface EmbeddableProfilingSchemaSelectorProps {
  /** Selected schema. While it isn't set, a default schema is selected through `onSchemaChange` */
  schema?: ProfilingSchema;
  onSchemaChange: (schema: ProfilingSchema) => void;
  /** Schemas with profiling data for the consumer's view, may be undefined while unknown */
  schemas?: ProfilingSchema[];
  /** Whether the schemas with data are loading */
  isLoadingSchemas: boolean;
  /** Set when the schemas with data cannot be fetched */
  schemasError?: Error;
}

export function EmbeddableProfilingSchemaSelector(props: EmbeddableProfilingSchemaSelectorProps) {
  const EmbeddableProfilingSchemaSelectorComponent =
    getProfilingComponent<EmbeddableProfilingSchemaSelectorProps>(
      EMBEDDABLE_PROFILING_SCHEMA_SELECTOR
    );

  return <EmbeddableProfilingSchemaSelectorComponent {...props} />;
}
