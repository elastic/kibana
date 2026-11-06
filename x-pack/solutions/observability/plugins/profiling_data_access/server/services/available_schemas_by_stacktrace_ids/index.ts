/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ProfilingSchema, ProfilingSchemasAvailability } from '@kbn/profiling-utils';
import { PROFILING_STACKTRACES_INDEX_BY_SCHEMA } from '@kbn/profiling-utils';
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
  abortSignal?: AbortSignal;
}

type StacktraceIdsDocumentsParams = Pick<
  AvailableSchemasByStacktraceIdsParams,
  'query' | 'indices' | 'stacktraceIdsField'
>;

// Enough sampled documents to find the stacktraces of a schema, while keeping each request small
const SAMPLE_SIZE = 1000;

// The most IDs an `ids` query accepts (`index.max_result_window`)
const MAX_STACKTRACE_IDS = 10_000;

// As in the Elasticsearch profiling stacktraces API: the random sampler doesn't support
// probabilities between 0.5 and 1, so small samples take every document.
const getSamplingProbability = (count: number): number =>
  count <= SAMPLE_SIZE * 2 ? 1 : SAMPLE_SIZE / count;

// As in the Elasticsearch profiling stacktraces API, the sampler seed and the shard copies to search
// derive from the request, so the same request samples the same documents.
const getSamplingKey = ({
  query,
  indices,
  stacktraceIdsField,
}: StacktraceIdsDocumentsParams): { seed: number; preference: string } => {
  const seed = createHash('sha256')
    .update(JSON.stringify({ query, indices, stacktraceIdsField, sampleSize: SAMPLE_SIZE }))
    .digest()
    .readInt32BE(0);

  return { seed, preference: String(seed) };
};

const getSampledStacktraceIds = async ({
  client,
  query,
  indices,
  stacktraceIdsField,
}: StacktraceIdsDocumentsParams & { client: ProfilingESClient }): Promise<string[]> => {
  const { seed, preference } = getSamplingKey({ query, indices, stacktraceIdsField });

  const countResponse = await client.search('count_stacktrace_ids_documents', {
    index: indices,
    size: 0,
    track_total_hits: true,
    query,
    preference,
    request_cache: true,
  });
  const count = countResponse.hits.total.value;

  if (count === 0) {
    return [];
  }

  return client.sampleStacktraceIds({
    query,
    indices,
    stacktraceIdsField,
    probability: getSamplingProbability(count),
    seed,
    preference,
    size: MAX_STACKTRACE_IDS,
  });
};

const hasSchemaStacktraces = async ({
  client,
  schema,
  stacktraceIds,
}: {
  client: ProfilingESClient;
  schema: ProfilingSchema;
  stacktraceIds: string[];
}): Promise<boolean> => {
  // Stacktraces are stored with their ID as the document ID
  const response = await client.search(`has_${schema}_stacktraces`, {
    index: PROFILING_STACKTRACES_INDEX_BY_SCHEMA[schema],
    size: 0,
    track_total_hits: 1,
    terminate_after: 1,
    ignore_unavailable: true,
    allow_no_indices: true,
    query: { ids: { values: stacktraceIds } },
  });

  return response.hits.total.value > 0;
};

/**
 * Checks which schemas have profiling data for stacktrace IDs held by other documents, like the
 * profiler stacktrace IDs of APM transactions, rather than for profiling events: the IDs of a
 * sample of the documents are looked up in the stacktraces of each schema.
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

    const stacktraceIds = await getSampledStacktraceIds({ client, ...params });

    if (stacktraceIds.length === 0) {
      return { schemas: [] };
    }

    const schemasWithStacktraces = await Promise.all(
      schemasToCheck.map((schema) => hasSchemaStacktraces({ client, schema, stacktraceIds }))
    );

    return { schemas: schemasToCheck.filter((_schema, index) => schemasWithStacktraces[index]) };
  };
}
