/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import type { EsqlToRecords } from '@elastic/elasticsearch/lib/helpers';
import { getEntitiesLatestIndexName } from '@kbn/cloud-security-posture-common/utils/helpers';
import { ENTITY_RELATIONSHIP_FIELDS } from '@kbn/cloud-security-posture-common/constants';
import { checkIfEntitiesIndexLookupMode, formatJsonProperty } from './utils';
import type { EntityId, RelationshipEdge } from './types';

interface BuildRelationshipsEsqlQueryParams {
  indexName: string;
  relationshipFields: readonly string[];
}

/**
 * Builds ES|QL query for fetching entity relationships from the generic entities index.
 * Uses FORK to expand each relationship field and aggregates results.
 * The filter is applied via the DSL filter parameter.
 * Uses LOOKUP JOIN to enrich target entity metadata.
 * Note: This function should only be called when the entities index is in lookup mode.
 */
const buildRelationshipsEsqlQuery = ({
  indexName,
  relationshipFields,
}: BuildRelationshipsEsqlQueryParams): string => {
  // Build COALESCE statements for each relationship field
  const coalesceStatements = relationshipFields
    .map(
      (field) =>
        `| EVAL entity.relationships.${field} = COALESCE(entity.relationships.${field}, [""])`
    )
    .join('\n');

  // Build FORK branches for each relationship field
  const forkBranches = relationshipFields
    .map(
      (field) =>
        `  (MV_EXPAND entity.relationships.${field} | EVAL relationship = "${field}" | EVAL _target_id = entity.relationships.${field} | DROP entity.relationships.*)`
    )
    .join('\n');

  // Store source entity fields before LOOKUP JOIN as they get overwritten by target entity fields
  const enrichmentSection = `// Store source entity fields before lookup (they get overwritten by target entity fields)
| RENAME _source_id = entity.id
| RENAME _source_name = entity.name
| RENAME _source_type = entity.type
| RENAME _source_sub_type = entity.sub_type
| RENAME _source_host_ip = host.ip
// Lookup target entity metadata
| EVAL entity.id = _target_id
| LOOKUP JOIN ${indexName} ON entity.id
| RENAME _target_name = entity.name
| RENAME _target_type = entity.type
| RENAME _target_sub_type = entity.sub_type
| RENAME _target_host_ip = host.ip
// Restore source entity fields
| RENAME entity.id = _source_id
| RENAME entity.name = _source_name
| RENAME entity.type = _source_type
| RENAME entity.sub_type = _source_sub_type
| RENAME host.ip = _source_host_ip`;

  // The ecsParentField hint is needed to later query actions done TO this entity
  // (e.g., to find events where this entity is the target).
  //
  // Currently we only query the generic entities index which uses entity.id,
  // so ecsParentField is always 'entity'.
  //
  // When entity-specific indices are added (user, host, service), we would use
  // generateFieldHintCases similar to actorEntityFieldHint/targetEntityFieldHint to detect:
  // - user.entity.id -> ecsParentField: 'user'
  // - host.entity.id -> ecsParentField: 'host'
  // - service.entity.id -> ecsParentField: 'service'
  // - entity.id -> ecsParentField: 'entity'
  const ecsParentFieldValue = 'entity';

  return `FROM ${indexName}
${coalesceStatements}
| FORK
${forkBranches}
| WHERE _target_id != ""
${enrichmentSection}
// Build enriched actors doc data with entity metadata (from the queried entity)
| EVAL actorDocData = CONCAT("{\\"id\\":\\"", entity.id, "\\",\\"type\\":\\"entity\\",\\"entity\\":{",
    "\\"availableInEntityStore\\":true",
    ",\\"ecsParentField\\":\\"${ecsParentFieldValue}\\"",
    ${formatJsonProperty('name', 'entity.name')},
    ${formatJsonProperty('type', 'entity.type')},
    ${formatJsonProperty('sub_type', 'entity.sub_type')},
    CASE(
      host.ip IS NOT NULL,
      CONCAT(",\\"host\\":", "{", "\\"ip\\":\\"", TO_STRING(host.ip), "\\"", "}"),
      ""
    ),
  "}}")
// Build enriched targets doc data with entity metadata
| EVAL targetDocData = CONCAT("{\\"id\\":\\"", _target_id, "\\",\\"type\\":\\"entity\\",\\"entity\\":{",
    "\\"availableInEntityStore\\":", CASE(_target_name IS NOT NULL OR _target_type IS NOT NULL, "true", "false"),
    ",\\"ecsParentField\\":\\"${ecsParentFieldValue}\\"",
    ${formatJsonProperty('name', '_target_name')},
    ${formatJsonProperty('type', '_target_type')},
    ${formatJsonProperty('sub_type', '_target_sub_type')},
    CASE(
      _target_host_ip IS NOT NULL,
      CONCAT(",\\"host\\":", "{", "\\"ip\\":\\"", TO_STRING(_target_host_ip), "\\"", "}"),
      ""
    ),
  "}}")
// Group by actor entity, relationship, and target type/subtype (for target grouping)
// This ensures targets with the same type are grouped together
| STATS badge = COUNT(*),
  // Actor entity grouping
  actorIds = VALUES(entity.id),
  actorNodeId = CASE(
    MV_COUNT(VALUES(entity.id)) == 1, TO_STRING(VALUES(entity.id)),
    MD5(MV_CONCAT(MV_SORT(VALUES(entity.id)), ","))
  ),
  actorIdsCount = COUNT_DISTINCT(entity.id),
  actorsDocData = VALUES(actorDocData),
  actorEntityType = VALUES(entity.type),
  actorEntitySubType = VALUES(entity.sub_type),
  actorEntityName = VALUES(entity.name),
  actorHostIps = VALUES(host.ip),
  // Target entity grouping - targets with same type/subtype are grouped
  targetIds = VALUES(_target_id),
  targetNodeId = CASE(
    MV_COUNT(VALUES(_target_id)) == 1, TO_STRING(VALUES(_target_id)),
    MD5(MV_CONCAT(MV_SORT(VALUES(_target_id)), ","))
  ),
  targetIdsCount = COUNT_DISTINCT(_target_id),
  targetsDocData = VALUES(targetDocData),
  targetEntityName = VALUES(_target_name),
  targetHostIps = VALUES(_target_host_ip)
    BY entity.id, relationship, targetEntityType = _target_type, targetEntitySubType = _target_sub_type
// Compute relationshipNodeId for deduplication (similar to labelNodeId for events)
// Multiple records with different target types share the same relationshipNodeId
| EVAL relationshipNodeId = CONCAT(TO_STRING(entity.id), "-", relationship)
// Sort by relationship alphabetically to ensure deterministic ordering
| SORT relationship ASC`;
};

/**
 * Builds a DSL filter for relationship queries from entityIds.
 * Creates a query that matches:
 * 1. Entities where entity.id is in the provided IDs (direct match)
 * 2. Entities where any entity.relationships.* field contains the provided IDs
 *    (entities that have relationships pointing to these IDs)
 */
const buildRelationshipDslFilter = (entityIds: EntityId[]) => {
  if (!entityIds || entityIds.length === 0) {
    return undefined;
  }

  // Extract just the IDs for the terms query
  const ids = entityIds.map((entity) => entity.id);

  // Build terms queries for each relationship field
  const relationshipQueries = ENTITY_RELATIONSHIP_FIELDS.map((field) => ({
    terms: {
      [`entity.relationships.${field}`]: ids,
    },
  }));

  return {
    bool: {
      should: [
        // Match entities by their ID
        {
          terms: {
            'entity.id': ids,
          },
        },
        // Match entities that have relationships pointing to these IDs
        ...relationshipQueries,
      ],
      minimum_should_match: 1,
    },
  };
};

/**
 * Fetches entity relationships from the generic entities index.
 * Queries for all relationship types for entities matching the provided entityIds.
 * Note: Relationships are only available in v2 entity store with lookup mode enabled.
 */
export const fetchEntityRelationships = async ({
  esClient,
  logger,
  entityIds,
  spaceId,
}: {
  esClient: IScopedClusterClient;
  logger: Logger;
  entityIds: EntityId[];
  spaceId: string;
}): Promise<EsqlToRecords<RelationshipEdge>> => {
  const indexName = getEntitiesLatestIndexName(spaceId);

  // Relationships require v2 entity store with lookup mode for LOOKUP JOIN enrichment
  const isLookupIndexAvailable = await checkIfEntitiesIndexLookupMode(esClient, logger, spaceId);
  if (!isLookupIndexAvailable) {
    logger.debug(
      `Entities index [${indexName}] is not in lookup mode, skipping relationship fetch`
    );
    return { columns: [], records: [] };
  }

  logger.trace(`Fetching relationships from index [${indexName}] for ${entityIds.length} entities`);

  const query = buildRelationshipsEsqlQuery({
    indexName,
    relationshipFields: ENTITY_RELATIONSHIP_FIELDS,
  });
  const filter = buildRelationshipDslFilter(entityIds);

  logger.trace(`Relationships ES|QL query: ${query}`);
  logger.trace(`Relationships filter: ${JSON.stringify(filter)}`);

  try {
    const response = await esClient.asCurrentUser.helpers
      .esql({
        columnar: false,
        filter,
        query,
      })
      .toRecords<RelationshipEdge>();

    logger.trace(`Fetched [${response.records.length}] relationship records`);

    return response;
  } catch (error) {
    // If the index doesn't exist, return empty result
    if (error.statusCode === 404) {
      logger.debug(`Entities index ${indexName} does not exist, skipping relationship fetch`);
      return { columns: [], records: [] };
    }
    throw error;
  }
};
