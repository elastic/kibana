/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProfilingSchema } from '@kbn/profiling-utils';
import { DEFAULT_PROFILING_SCHEMA } from '@kbn/profiling-utils';

export const getDefaultSchema = (schemasWithData: readonly ProfilingSchema[]): ProfilingSchema =>
  schemasWithData.length === 1 ? schemasWithData[0] : DEFAULT_PROFILING_SCHEMA;
