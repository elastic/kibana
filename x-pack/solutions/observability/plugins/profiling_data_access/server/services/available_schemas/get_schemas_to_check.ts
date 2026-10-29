/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuildFlavor } from '@kbn/config';
import { ProfilingSchema } from '@kbn/profiling-utils';
import { isServerless } from '../../utils/is_serverless';

/** Schemas that can have profiling data: Universal Profiling is not available on serverless. */
export const getSchemasToCheck = (buildFlavor: BuildFlavor): ProfilingSchema[] =>
  isServerless(buildFlavor) ? [ProfilingSchema.OTEL] : Object.values(ProfilingSchema);
