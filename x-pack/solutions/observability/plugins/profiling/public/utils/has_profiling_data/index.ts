/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProfilingSchemasStatus } from '@kbn/profiling-utils';

/** Whether there is profiling data the app can show. Unlike `hasUsableProfilingData`, Universal
 * Profiling data counts even when its setup is incomplete, so the app stays usable for it. */
export const hasProfilingData = (status?: ProfilingSchemasStatus): boolean =>
  status?.isEnabled === true && (status.otel.hasData || status.universalProfiling.hasData);
