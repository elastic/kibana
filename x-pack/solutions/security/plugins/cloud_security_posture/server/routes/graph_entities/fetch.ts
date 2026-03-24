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
import { SECURITY_ALERTS_PARTIAL_IDENTIFIER } from '../../../common/constants';
import { generateFieldHintCases, checkIfEntitiesIndexLookupMode } from '../graph/utils';
import type { EntityRecord } from './types';

interface FetchEntitiesParams {
  esClient: IScopedClusterClient;
  logger: Logger;
  entityIds: string[];
  start: string | number;
  end: string | number;
  spaceId: string;
  indexPatterns?: string[];
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
}: FetchEntitiesParams): Promise<EsqlToRecords<EntityRecord>> => {
  const lookupIndexName = getEntitiesLatestIndexName(spaceId);
  const resolvedIndexPatterns = indexPatterns ?? [
    `${SECURITY_ALERTS_PARTIAL_IDENTIFIER}${spaceId}`,
    'logs-*',
  ];

  const isLookupIndexAvailable = await checkIfEntitiesIndexLookupMode(esClient, logger, spaceId);

  // Include entity store index in FROM clause when available so that
  // entities that only exist in the entity store (e.g. relationship targets)
  // can be found directly, not just via event enrichment.
  const queryIndexPatterns = isLookupIndexAvailable
    ? [...resolvedIndexPatterns, lookupIndexName]
    : resolvedIndexPatterns;

  const query = buildEntitiesEsqlQuery({
    indexPatterns: queryIndexPatterns,
    lookupIndexName,
    isLookupIndexAvailable,
    entityCount: entityIds.length,
  });

  logger.trace(`Fetching entities with query [${query}]`);

  return await esClient.asCurrentUser.helpers
    .esql({
      columnar: false,
      filter: buildDslFilter(entityIds, start, end, isLookupIndexAvailable, lookupIndexName),
      query,
      // @ts-expect-error - esql helper params types are not up to date
      params: entityIds.map((id, idx) => ({ [`entity_id${idx}`]: id })),
    })
    .toRecords<EntityRecord>();
};

const buildDslFilter = (
  entityIds: string[],
  start: string | number,
  end: string | number,
  isLookupIndexAvailable: boolean,
  lookupIndexName: string
) => {
  const entityFieldTerms = [
    ...GRAPH_ACTOR_ENTITY_FIELDS.map((field) => ({
      terms: { [field]: entityIds },
    })),
    ...GRAPH_TARGET_ENTITY_FIELDS.map((field) => ({
      terms: { [field]: entityIds },
    })),
  ];

  // When the entity store index is included in the FROM clause, allow entity store
  // documents to match without the timestamp constraint since their timestamps may
  // be outside the event time range.
  const timestampFilter = isLookupIndexAvailable
    ? {
        bool: {
          should: [
            { range: { '@timestamp': { gte: start, lte: end } } },
            { term: { _index: lookupIndexName } },
          ],
          minimum_should_match: 1,
        },
      }
    : { range: { '@timestamp': { gte: start, lte: end } } };

  return {
    bool: {
      filter: [
        timestampFilter,
        {
          bool: {
            should: entityFieldTerms,
            minimum_should_match: 1,
          },
        },
      ],
    },
  };
};

interface BuildEntitiesQueryParams {
  indexPatterns: string[];
  lookupIndexName: string;
  isLookupIndexAvailable: boolean;
  entityCount: number;
}

const buildEntitiesEsqlQuery = ({
  indexPatterns,
  lookupIndexName,
  isLookupIndexAvailable,
  entityCount,
}: BuildEntitiesQueryParams): string => {
  const entityIdParams = Array.from({ length: entityCount }, (_, idx) => `?entity_id${idx}`).join(
    ', '
  );

  const allEntityFields = [...GRAPH_ACTOR_ENTITY_FIELDS, ...GRAPH_TARGET_ENTITY_FIELDS];

  // Collect ALL entity IDs from all actor and target fields using MV_APPEND.
  // This handles multi-value target fields (e.g. entity.target.id can be an array).
  // After MV_EXPAND, we get one row per entity ID and can match each individually.
  const entityIdEvals = [
    '| EVAL entityId = TO_STRING(null)',
    ...allEntityFields.map(
      (field) => `| EVAL entityId = CASE(
    ${field} IS NULL,
    entityId,
    CASE(
      entityId IS NULL,
      ${field},
      MV_DEDUPE(MV_APPEND(entityId, ${field}))
    )
  )`
    ),
  ].join('\n');

  // Generate field hint CASE statements to determine ecsParentField
  const entityFieldHintCases = generateFieldHintCases(allEntityFields, 'entityId');

  return `FROM ${indexPatterns.filter((p) => p.length > 0).join(',')} METADATA _index
${entityIdEvals}
| MV_EXPAND entityId
| WHERE entityId IN (${entityIdParams})
| EVAL ecsParentField = CASE(
${entityFieldHintCases},
    "entity"
  )
| EVAL timestamp = TO_STRING(\`@timestamp\`)
| EVAL sourceIps = source.ip
| EVAL sourceCountryCodes = source.geo.country_iso_code
${buildSingleEntityEnrichment(isLookupIndexAvailable, lookupIndexName)}
| STATS ecsParentField = MIN(ecsParentField),
  entityName = MIN(entityName),
  entityType = MIN(entityType),
  entitySubType = MIN(entitySubType),
  hostIp = MIN(hostIp),
  availableInEntityStore = MAX(availableInEntityStore),
  timestamp = MAX(timestamp),
  sourceIps = MV_DEDUPE(VALUES(sourceIps)),
  sourceCountryCodes = MV_DEDUPE(VALUES(sourceCountryCodes))
    BY entityId`;
};

/**
 * Chooses single-entity enrichment method based on availability.
 * Unlike buildEntityEnrichment (which enriches actor + target pairs),
 * this enriches a single entityId field.
 */
const buildSingleEntityEnrichment = (
  isLookupIndexAvailable: boolean,
  lookupIndexName: string
): string => {
  if (isLookupIndexAvailable) {
    return `// Drop existing entity.id from source docs before LOOKUP JOIN to avoid conflicts
| DROP entity.id
| EVAL entity.id = entityId
| LOOKUP JOIN ${lookupIndexName} ON entity.id
| EVAL availableInEntityStore = CASE(
    entity.name IS NOT NULL OR entity.type IS NOT NULL,
    true,
    false
  )
| EVAL entityName = entity.name
| EVAL entityType = entity.type
| EVAL entitySubType = entity.sub_type
| EVAL hostIp = TO_STRING(host.ip)`;
  }

  return `// No enrichment available - use null values
| EVAL entityName = TO_STRING(null)
| EVAL entityType = TO_STRING(null)
| EVAL entitySubType = TO_STRING(null)
| EVAL hostIp = TO_STRING(null)
| EVAL availableInEntityStore = false`;
};
