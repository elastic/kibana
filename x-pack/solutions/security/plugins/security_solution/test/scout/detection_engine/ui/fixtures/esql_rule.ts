/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-security';

/**
 * Each space gets its own source index so the ES|QL validation does not depend on data that
 * other specs create. The `auditbeat-` prefix keeps the index readable by the platform engineer
 * role, which runs the ES|QL validation request.
 */
export const esqlSourceIndexName = (spaceId: string): string =>
  `auditbeat-scout-esql-rule-${spaceId.replace(/[^a-z0-9]/gi, '').toLowerCase()}`;

/** A second source index of the space, for tests that move a rule to another data source. */
export const esqlSecondarySourceIndexName = (spaceId: string): string =>
  `${esqlSourceIndexName(spaceId)}-secondary`;

/** A source name that no index matches. */
export const MISSING_ESQL_SOURCE = 'auditbeat-scout-esql-rule-missing-source';

export const createEsqlSourceIndex = async (esClient: EsClient, index: string): Promise<void> => {
  await esClient.indices.delete({ index, ignore_unavailable: true });
  await esClient.indices.create({
    index,
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
        event: { properties: { category: { type: 'keyword' } } },
        agent: {
          properties: {
            name: { type: 'keyword' },
            type: { type: 'keyword' },
          },
        },
      },
    },
  });
};

export const deleteEsqlSourceIndex = async (esClient: EsClient, index: string): Promise<void> => {
  await esClient.indices.delete({ index, ignore_unavailable: true });
};

/** An aggregating query: its columns are `_count` and `event.category`. */
export const getEsqlStatsQuery = (index: string): string =>
  `from ${index} | stats _count=count(event.category) by event.category`;

/** Keeps `agent.*` and `_id`, and adds the `test_id` column that the name override picks. */
export const getEsqlRuleQuery = (index: string): string =>
  `from ${index} metadata _id, _version, _index | keep agent.*,_id | eval test_id=_id`;
