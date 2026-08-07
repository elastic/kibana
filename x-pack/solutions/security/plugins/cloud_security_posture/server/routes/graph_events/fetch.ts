/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import {
  GRAPH_ACTOR_ENTITY_FIELDS,
  GRAPH_TARGET_ENTITY_FIELDS,
} from '@kbn/cloud-security-posture-common/constants';
import type { EsqlToRecords } from '@elastic/elasticsearch/lib/helpers';
import { getEntitiesLatestIndexName } from '@kbn/cloud-security-posture-common/utils/helpers';
import { SECURITY_ALERTS_PARTIAL_IDENTIFIER } from '../../../common/constants';
import {
  buildActorEntityIdEval,
  buildTargetEntityIdEvals,
  buildEntityFieldHints,
  buildSourceMetadataEvals,
  checkIfEntitiesIndexExists,
} from '../graph/utils';
import type { EventRecord } from './types';

interface FetchEventsParams {
  esClient: IScopedClusterClient;
  logger: Logger;
  eventIds: string[];
  start: string | number;
  end: string | number;
  indexPatterns: string[];
  spaceId: string;
}

/**
 * Fetches enriched event/alert details.
 * Queries events by document ID (_id) and enriches with entity store data via LOOKUP JOIN.
 */
export const fetchEvents = async ({
  esClient,
  logger,
  eventIds,
  start,
  end,
  indexPatterns,
  spaceId,
}: FetchEventsParams): Promise<EsqlToRecords<EventRecord>> => {
  const entityStoreIndexExists = await checkIfEntitiesIndexExists(esClient, logger, spaceId);

  const query = buildEventsEsqlQuery({
    indexPatterns,
    eventCount: eventIds.length,
    entityStoreIndexExists,
    spaceId,
  });

  logger.trace(`Fetching events with query [${query}]`);

  return await esClient.asCurrentUser.helpers
    .esql({
      columnar: false,
      filter: buildDslFilter(eventIds, start, end),
      query,
      params: eventIds.map((id, idx) => ({ [`doc_id${idx}`]: id })),
    })
    .toRecords<EventRecord>();
};

const buildDslFilter = (eventIds: string[], start: string | number, end: string | number) => ({
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
        terms: {
          _id: eventIds,
        },
      },
    ],
  },
});

interface BuildEventsQueryParams {
  indexPatterns: string[];
  eventCount: number;
  entityStoreIndexExists: boolean;
  spaceId: string;
}

const buildEventsEsqlQuery = ({
  indexPatterns,
  eventCount,
  entityStoreIndexExists,
  spaceId,
}: BuildEventsQueryParams): string => {
  // Generate document ID params
  const documentIdParams = Array.from({ length: eventCount }, (_, idx) => `?doc_id${idx}`).join(
    ', '
  );

  const indexName = getEntitiesLatestIndexName(spaceId);
  const enrichmentEsql = entityStoreIndexExists
    ? `| DROP entity.id
| DROP entity.target.id
// rename entity.*fields before next pipeline to avoid name collisions
| EVAL entity.id = actorEntityId
| LOOKUP JOIN ${indexName} ON entity.id
| RENAME actorEntityName    = entity.name
| RENAME actorEntityType    = entity.type
| RENAME actorEntitySubType = entity.sub_type
| INLINE STATS actorHostIp = VALUES(TO_STRING(host.ip)) // Extract host IPs as string type
| RENAME actorLookupEntityId = entity.id
| RENAME actorEntityEngineType = entity.EngineMetadata.Type

| EVAL entity.id = targetEntityId
| LOOKUP JOIN ${indexName} ON entity.id
| RENAME targetEntityName    = entity.name
| RENAME targetEntityType    = entity.type
| RENAME targetEntitySubType = entity.sub_type
| INLINE STATS targetHostIp = VALUES(TO_STRING(host.ip)) // Extract host IPs as string type
| RENAME targetLookupEntityId = entity.id
| RENAME targetEntityEngineType = entity.EngineMetadata.Type`
    : `// No enrichment available - use null values
| EVAL actorEntityName = TO_STRING(null)
| EVAL actorEntityType = TO_STRING(null)
| EVAL actorEntitySubType = TO_STRING(null)
| EVAL actorHostIp = TO_STRING(null)
| EVAL actorEntityEngineType = TO_STRING(null)
| EVAL targetEntityName = TO_STRING(null)
| EVAL targetEntityType = TO_STRING(null)
| EVAL targetEntitySubType = TO_STRING(null)
| EVAL targetHostIp = TO_STRING(null)
| EVAL targetEntityEngineType = TO_STRING(null)`;

  return `FROM ${indexPatterns
    .filter((indexPattern) => indexPattern.length > 0)
    .join(',')} METADATA _id, _index
| WHERE _id IN (${documentIdParams})
${buildActorEntityIdEval(GRAPH_ACTOR_ENTITY_FIELDS)}
${buildTargetEntityIdEvals(GRAPH_TARGET_ENTITY_FIELDS)}
| MV_EXPAND actorEntityId
| MV_EXPAND targetEntityId
${buildEntityFieldHints(GRAPH_ACTOR_ENTITY_FIELDS, GRAPH_TARGET_ENTITY_FIELDS)}
| EVAL timestamp = TO_STRING(\`@timestamp\`)
${enrichmentEsql}
| EVAL docId = _id
| EVAL eventId = event.id
| EVAL index = _index
| EVAL action = event.action
| EVAL isAlert = _index LIKE "*${SECURITY_ALERTS_PARTIAL_IDENTIFIER}*"
${buildSourceMetadataEvals()}
// Aggregate by document identity to keep event/index pairs stable across expanded rows
| STATS
  timestamp = MAX(timestamp),
  action = MIN(action),
  isAlert = MAX(isAlert),
  actorEntityId = MIN(actorEntityId),
  actorEcsParentField = MIN(actorEcsParentField),
  actorEntityName = MIN(actorEntityName),
  targetEntityId = MIN(targetEntityId),
  targetEcsParentField = MIN(targetEcsParentField),
  targetEntityName = MIN(targetEntityName),
  sourceIps = MV_DEDUPE(VALUES(sourceIps)),
  sourceCountryCodes = MV_DEDUPE(VALUES(sourceCountryCodes))
    BY docId, eventId, index`;
};
