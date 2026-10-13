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
  /** Start of the time range checked for schemas with data, in milliseconds */
  rangeFrom: number;
  /** End of the time range checked for schemas with data, in milliseconds */
  rangeTo: number;
  /** Query that the profiling data of the schemas has to match */
  kuery: string;
  /** Selected schema. While it isn't set, a default schema is selected through `onSchemaChange` */
  schema?: ProfilingSchema;
  onSchemaChange: (schema: ProfilingSchema) => void;
}

export function EmbeddableProfilingSchemaSelector(props: EmbeddableProfilingSchemaSelectorProps) {
  const EmbeddableProfilingSchemaSelectorComponent =
    getProfilingComponent<EmbeddableProfilingSchemaSelectorProps>(
      EMBEDDABLE_PROFILING_SCHEMA_SELECTOR
    );

  return <EmbeddableProfilingSchemaSelectorComponent {...props} />;
}
