/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ProfilingSchemasAvailability } from '@kbn/profiling-utils';
import type { ProfilingSchema } from '@kbn/profiling-utils';
import { PROFILING_EVENTS_INDEX_BY_SCHEMA } from '@kbn/profiling-utils';
import type { ProfilingESClient } from '../../utils/profiling_es_client';
import type { RegisterServicesParams } from '../register_services';
import { getSchemasToCheck } from './get_schemas_to_check';

export interface AvailableSchemasParams {
  esClient: ElasticsearchClient;
  query: QueryDslQueryContainer;
  abortSignal?: AbortSignal;
}

const hasSchemaData = async ({
  client,
  schema,
  query,
}: {
  client: ProfilingESClient;
  schema: ProfilingSchema;
  query: QueryDslQueryContainer;
}): Promise<boolean> => {
  const response = await client.search(`has_${schema}_profiling_data`, {
    index: PROFILING_EVENTS_INDEX_BY_SCHEMA[schema],
    size: 0,
    track_total_hits: 1,
    terminate_after: 1,
    ignore_unavailable: true,
    allow_no_indices: true,
    query,
  });

  return response.hits.total.value > 0;
};

export function createGetAvailableSchemasService({
  buildFlavor,
  createProfilingEsClient,
}: RegisterServicesParams) {
  const schemasToCheck = getSchemasToCheck(buildFlavor);

  return async ({
    esClient,
    query,
    abortSignal,
  }: AvailableSchemasParams): Promise<ProfilingSchemasAvailability> => {
    const client = createProfilingEsClient({ esClient, abortSignal });

    const schemasWithData = await Promise.all(
      schemasToCheck.map((schema) => hasSchemaData({ client, schema, query }))
    );

    return { schemas: schemasToCheck.filter((_schema, index) => schemasWithData[index]) };
  };
}
