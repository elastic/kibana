/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransportRequestOptions } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { EntityType } from '../../../common/domain/definitions/entity_schema';
import type { Entity } from '../../../common/domain/definitions/entity.gen';
import { runWithSpan } from '../../telemetry/traces';

/**
 * When provided, the query execution is wrapped in an APM/OTel span via `runWithSpan`. `name`
 * is the short operation identifier (e.g. `probe_query`, `extraction_query`) — callers on the
 * remote/CCS path distinguish themselves with a `remote_` prefix (e.g. `remote_probe_query`).
 */
export interface ExecuteEsqlQueryTelemetry {
  name: string;
  namespace: string;
  type: EntityType;
}

interface ExecuteEsqlQueryParams {
  esClient: ElasticsearchClient;
  query: string;
  abortController?: AbortController;
  excludeColdFrozenTiers?: boolean;
  telemetry?: ExecuteEsqlQueryTelemetry;
}

const doExecuteEsqlQuery = async ({
  esClient,
  query,
  abortController,
  excludeColdFrozenTiers = true,
}: ExecuteEsqlQueryParams): Promise<ESQLSearchResponse> => {
  const options: TransportRequestOptions = {};
  if (abortController?.signal) {
    options.signal = abortController.signal;
  }

  const response = (await esClient.esql.query(
    {
      query,
      drop_null_columns: true,
      allow_partial_results: true,
      filter: buildDslFilters(excludeColdFrozenTiers),
    },
    options
  )) as unknown as ESQLSearchResponse;

  return response;
};

export const executeEsqlQuery = async ({
  telemetry,
  ...params
}: ExecuteEsqlQueryParams): Promise<ESQLSearchResponse> => {
  if (!telemetry) {
    return doExecuteEsqlQuery(params);
  }

  return runWithSpan({
    name: `entityStore.logs_extraction.${telemetry.name}`,
    namespace: telemetry.namespace,
    attributes: {
      'entity_store.logs_extraction.operation': telemetry.name,
      'entity_store.entity.type': telemetry.type,
    },
    cb: () => doExecuteEsqlQuery(params),
  });
};

/**
 * Converts columnar ESQL response to bulk objects for the CRUD client.
 * Keeps flat dot-notation keys (e.g. entity.id); the CRUD API would flatten them later anyway.
 */
export const esqlResponseToBulkObjects = (
  esqlResponse: ESQLSearchResponse,
  type: EntityType,
  fieldsToIgnore: string[]
): Array<{ type: EntityType; doc: Entity }> => {
  const { columns, values } = esqlResponse;
  const objects: Array<{ type: EntityType; doc: Entity }> = [];

  for (const row of values) {
    const doc: Record<string, unknown> = {};
    for (let i = 0; i < row.length; i++) {
      const key = columns[i].name;
      if (fieldsToIgnore.includes(key) || row[i] === null) {
        continue;
      }
      doc[key] = row[i];
    }
    objects.push({ type, doc: doc as Entity });
  }
  return objects;
};

function buildDslFilters(excludeColdFrozenTiers: boolean) {
  const dslFilter: QueryDslQueryContainer = {};

  if (excludeColdFrozenTiers) {
    dslFilter.bool = {
      must_not: [
        {
          terms: {
            _tier: ['data_cold', 'data_frozen'],
          },
        },
      ],
    };
  }

  return dslFilter;
}
