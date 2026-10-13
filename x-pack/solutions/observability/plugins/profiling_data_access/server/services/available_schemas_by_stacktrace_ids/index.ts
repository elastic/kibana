/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ProfilingSchema, ProfilingSchemasAvailability } from '@kbn/profiling-utils';
import { isEmpty } from 'lodash';
import type { ProfilingESClient } from '../../utils/profiling_es_client';
import { getSchemasToCheck } from '../available_schemas/get_schemas_to_check';
import type { RegisterServicesParams } from '../register_services';

export interface AvailableSchemasByStacktraceIdsParams {
  esClient: ElasticsearchClient;
  /** Filters the documents that hold the stacktrace IDs, e.g. the transactions of an APM service */
  query: QueryDslQueryContainer;
  /** Indices of the documents that hold the stacktrace IDs */
  indices: string[];
  /** Field of those documents that holds the stacktrace IDs */
  stacktraceIdsField: string;
  /** Duration of the queried time range, required by the profiling stacktraces API */
  durationSeconds: number;
  abortSignal?: AbortSignal;
}

// Enough sampled documents to find the stacktraces of a schema, while keeping each request small
const SAMPLE_SIZE = 1000;

const hasSchemaStacktraces = async ({
  client,
  schema,
  query,
  indices,
  stacktraceIdsField,
  durationSeconds,
}: Omit<AvailableSchemasByStacktraceIdsParams, 'esClient' | 'abortSignal'> & {
  client: ProfilingESClient;
  schema: ProfilingSchema;
}): Promise<boolean> => {
  const response = await client.profilingStacktraces({
    query,
    indices,
    stacktraceIdsField,
    durationSeconds,
    sampleSize: SAMPLE_SIZE,
    schema,
  });

  // The stacktrace IDs are collected from the given documents whatever the schema, but only the
  // ones stored in the schema resolve into stack traces.
  return !isEmpty(response.stack_traces);
};

/**
 * Checks which schemas have profiling data for stacktrace IDs held by other documents, like the
 * profiler stacktrace IDs of APM transactions, rather than for profiling events.
 */
export function createGetAvailableSchemasByStacktraceIdsService({
  buildFlavor,
  createProfilingEsClient,
}: RegisterServicesParams) {
  const schemasToCheck = getSchemasToCheck(buildFlavor);

  return async ({
    esClient,
    abortSignal,
    ...params
  }: AvailableSchemasByStacktraceIdsParams): Promise<ProfilingSchemasAvailability> => {
    const client = createProfilingEsClient({ esClient, abortSignal });

    const schemasWithStacktraces = await Promise.all(
      schemasToCheck.map((schema) => hasSchemaStacktraces({ client, schema, ...params }))
    );

    return { schemas: schemasToCheck.filter((_schema, index) => schemasWithStacktraces[index]) };
  };
}
