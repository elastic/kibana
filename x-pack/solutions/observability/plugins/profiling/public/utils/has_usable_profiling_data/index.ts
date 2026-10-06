/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProfilingStatus } from '@kbn/profiling-utils';

/** Whether there is profiling data the app can query:
 * OTel data can be used without any setup while Universal Profiling requires setup. */
export const hasUsableProfilingData = (status?: ProfilingStatus): boolean =>
  status?.isEnabled === true &&
  (status.otel.hasData ||
    (status.universalProfiling.hasData && status.universalProfiling.hasSetup));
