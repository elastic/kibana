/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProfilingStatus } from '@kbn/profiling-utils';

export const hasProfilingData = (status?: ProfilingStatus): boolean =>
  Boolean(status?.otel.hasData || status?.universalProfiling.hasData);
