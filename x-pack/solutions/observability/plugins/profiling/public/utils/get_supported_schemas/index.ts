/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProfilingSchemasStatus } from '@kbn/profiling-utils';
import { ProfilingSchema } from '@kbn/profiling-utils';

/** Schemas that are available and have data in the deployment, none while the status is unknown or when profiling is disabled*/
export const getSupportedSchemas = (status?: ProfilingSchemasStatus): ProfilingSchema[] => {
  if (!status?.isEnabled) {
    return [];
  }

  return Object.values(ProfilingSchema).filter((schema) =>
    schema === ProfilingSchema.ECS
      ? status.universalProfiling.isAvailable && status.universalProfiling.hasData
      : status.otel.isAvailable && status.otel.hasData
  );
};
