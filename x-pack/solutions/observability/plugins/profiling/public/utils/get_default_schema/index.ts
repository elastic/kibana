/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProfilingSchema } from '@kbn/profiling-utils';
import { DEFAULT_PROFILING_SCHEMA } from '@kbn/profiling-utils';

export const getDefaultSchema = (
  schemasWithData: readonly ProfilingSchema[],
  supportedSchemas: readonly ProfilingSchema[]
): ProfilingSchema => {
  if (schemasWithData.length === 1) {
    return schemasWithData[0];
  }

  if (supportedSchemas.length > 0) {
    return supportedSchemas.includes(DEFAULT_PROFILING_SCHEMA)
      ? DEFAULT_PROFILING_SCHEMA
      : supportedSchemas[0];
  }

  return DEFAULT_PROFILING_SCHEMA;
};
