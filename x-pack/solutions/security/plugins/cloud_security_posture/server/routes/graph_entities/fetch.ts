/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import { getEntitiesLatestIndexName } from '@kbn/cloud-security-posture-common/utils/helpers';
import {
  GRAPH_ACTOR_ENTITY_FIELDS,
  GRAPH_TARGET_ENTITY_FIELDS,
} from '@kbn/cloud-security-posture-common/constants';
import type { EsqlToRecords } from '@elastic/elasticsearch/lib/helpers';
import { generateFieldHintCases, buildSingleEntityLookupJoinEsql } from '../graph/utils';
import type { EntityRecord } from './types';

interface FetchEntitiesParams {
  esClient: IScopedClusterClient;
  logger: Logger;
  entityIds: string[];
  start: string | number;
  end: string | number;
  spaceId: string;
  indexPatterns?: string[];
  nodesLimit?: number;
}

/**
 * Fetches enriched entity details from events/alerts and entity store.
 * Queries events/alerts to find entity IDs and determine ecsParentField (like fetch_graph.ts).
 * Then enriches with entity store data via LOOKUP JOIN if available.
 */
export const fetchEntities = async ({
  esClient,
  logger,
  entityIds,
  start,
  end,
  spaceId,
  indexPatterns,
  nodesLimit,
}: FetchEntitiesParams): Promise<EsqlToRecords<EntityRecord>> => {
  const lookupIndexName = getEntitiesLatestIndexName(spaceId);
  const limit = nodesLimit ?? 1000;
  const resolvedIndexPatterns = indexPatterns ?? ['.alerts-security.alerts-*', 'logs-*'];

  const query = buildEntitiesEsqlQuery({
    indexPatterns: resolvedIndexPatterns,
    lookupIndexName,
    entityCount: entityIds.length,
    limit,
  });

  logger.trace(`Fetching entities with query [${query}]`);

  return await esClient.asCurrentUser.helpers
    .esql({
      columnar: false,
      filter: buildDslFilter(entityIds, start, end),
      query,
      // @ts-ignore - types are not up to date
      params: entityIds.map((id, idx) => ({ [`entity_id${idx}`]: id })),
    })
    .toRecords<EntityRecord>();
};

const buildDslFilter = (entityIds: string[], start: string | number, end: string | number) => ({
  bool: {
    filter: [
      {
        range: {
          '@timestamp': {
            gte: start,
            lte: end,
          },
        },
      },
      {
        bool: {
          should: [
            ...GRAPH_ACTOR_ENTITY_FIELDS.map((field) => ({
              terms: { [field]: entityIds },
            })),
            ...GRAPH_TARGET_ENTITY_FIELDS.map((field) => ({
              terms: { [field]: entityIds },
            })),
          ],
          minimum_should_match: 1,
        },
      },
    ],
  },
});

interface BuildEntitiesQueryParams {
  indexPatterns: string[];
  lookupIndexName: string;
  entityCount: number;
  limit: number;
}

const buildEntitiesEsqlQuery = ({
  indexPatterns,
  lookupIndexName,
  entityCount,
  limit,
}: BuildEntitiesQueryParams): string => {
  const entityIdParams = Array.from({ length: entityCount }, (_, idx) => `?entity_id${idx}`).join(
    ', '
  );

  const allEntityFields = [...GRAPH_ACTOR_ENTITY_FIELDS, ...GRAPH_TARGET_ENTITY_FIELDS];
  const entityFieldsCoalesce = allEntityFields.join(',\n    ');

  // Generate field hint CASE statements to determine ecsParentField
  const entityFieldHintCases = generateFieldHintCases(allEntityFields, 'entityId');

  return `FROM ${indexPatterns.filter((p) => p.length > 0).join(',')} METADATA _index
| EVAL entityId = COALESCE(
    ${entityFieldsCoalesce}
  )
| WHERE entityId IN (${entityIdParams})
| EVAL ecsParentField = CASE(
${entityFieldHintCases},
    "entity"
  )
| EVAL timestamp = TO_STRING(\`@timestamp\`)
${buildSingleEntityLookupJoinEsql(lookupIndexName)}
| STATS ecsParentField = MIN(ecsParentField),
  entityName = MIN(entityName),
  entityType = MIN(entityType),
  entitySubType = MIN(entitySubType),
  hostIp = MIN(hostIp),
  availableInEntityStore = MAX(availableInEntityStore),
  timestamp = MAX(timestamp)
    BY entityId
| LIMIT ${limit}`;
};
