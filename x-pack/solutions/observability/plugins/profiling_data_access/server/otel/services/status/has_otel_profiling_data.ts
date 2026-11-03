/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PROFILING_EVENTS_INDEX_BY_SCHEMA, ProfilingSchema } from '@kbn/profiling-utils';
import type { ProfilingESClient } from '../../../utils/profiling_es_client';

export async function hasOtelProfilingData({
  client,
}: {
  client: ProfilingESClient;
}): Promise<boolean> {
  const response = await client.search('has_any_otel_profiling_data', {
    index: PROFILING_EVENTS_INDEX_BY_SCHEMA[ProfilingSchema.OTEL],
    size: 0,
    track_total_hits: 1,
    terminate_after: 1,
    ignore_unavailable: true,
    allow_no_indices: true,
  });

  return response.hits.total.value > 0;
}
