/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ProfilingSchema } from '@kbn/profiling-utils';
import { decodeStackTraceResponse } from '@kbn/profiling-utils';
import type { ProfilingESClient } from '@kbn/profiling-data-access-plugin/server';
import type { ProjectTimeQuery } from './query';

export async function searchStackTraces({
  client,
  filter,
  sampleSize,
  durationSeconds,
  showErrorFrames,
  schema,
}: {
  client: ProfilingESClient;
  filter: ProjectTimeQuery;
  sampleSize: number;
  durationSeconds: number;
  showErrorFrames: boolean;
  schema: ProfilingSchema;
}) {
  const response = await client.profilingStacktraces({
    query: filter,
    sampleSize,
    durationSeconds,
    schema,
  });

  return decodeStackTraceResponse(response, showErrorFrames);
}
