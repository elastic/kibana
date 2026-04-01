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
import {
  checkIfEntitiesIndexLookupMode,
  concatJsonObjectPropertyBool,
  concatJsonObjectPropertyEsqlExpr,
  concatJsonObjectPropertyString,
  concatJsonObjectPropertyEsqlExprSafe,
  JSON_OBJECT_END,
  JSON_OBJECT_SEPARATOR,
  JSON_OBJECT_START,
  concatJsonObjectPropertyEsqlExprAsString,
} from './utils';
import type { EntityId, EntityRecord, RelationshipEdge } from './types';

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
| RENAME _source_engine_metadata_type = entity.EngineMetadata.Type
// Lookup target entity metadata
| EVAL entity.id = _target_id
| LOOKUP JOIN ${indexName} ON entity.id
| RENAME _target_name = entity.name
| RENAME _target_type = entity.type
| RENAME _target_sub_type = entity.sub_type
| RENAME _target_host_ip = host.ip
| RENAME _target_engine_metadata_type = entity.EngineMetadata.Type
// Restore source entity fields
| RENAME entity.id = _source_id
| RENAME entity.name = _source_name
| RENAME entity.type = _source_type
| RENAME entity.sub_type = _source_sub_type
| RENAME host.ip = _source_host_ip
| RENAME entity.EngineMetadata.Type = _source_engine_metadata_type`;

  return `FROM ${indexName}
${coalesceStatements}
| FORK
${forkBranches}
| WHERE _target_id != ""
${enrichmentSection}
// Build enriched actors doc data with entity metadata (from the queried entity)
| EVAL actorDocData = CONCAT(${JSON_OBJECT_START},
    ${concatJsonObjectPropertyEsqlExprSafe('id', 'entity.id')},
    ${JSON_OBJECT_SEPARATOR}, ${concatJsonObjectPropertyString('type', 'entity')},
    ${JSON_OBJECT_SEPARATOR}, "\\"entity\\":", ${JSON_OBJECT_START},
      ${concatJsonObjectPropertyBool('availableInEntityStore', true)},
      CASE(entity.name IS NOT NULL, CONCAT(${JSON_OBJECT_SEPARATOR},
        ${concatJsonObjectPropertyEsqlExprAsString('name', 'entity.name')}), ""),
      CASE(entity.type IS NOT NULL, CONCAT(${JSON_OBJECT_SEPARATOR},
        ${concatJsonObjectPropertyEsqlExprAsString('type', 'entity.type')}), ""),
      CASE(entity.sub_type IS NOT NULL, CONCAT(${JSON_OBJECT_SEPARATOR},
        ${concatJsonObjectPropertyEsqlExprAsString('sub_type', 'entity.sub_type')}), ""),
      CASE(entity.EngineMetadata.Type IS NOT NULL, CONCAT(${JSON_OBJECT_SEPARATOR},
        ${concatJsonObjectPropertyEsqlExprAsString(
          'engine_type',
          'entity.EngineMetadata.Type'
        )}), ""),
      CASE(
        host.ip IS NOT NULL,
        CONCAT(${JSON_OBJECT_SEPARATOR}, "\\"host\\":", ${JSON_OBJECT_START},
          "\\"ip\\":\\"", TO_STRING(host.ip), "\\"",
          ${JSON_OBJECT_END}),
        ""
      ),
      ${JSON_OBJECT_SEPARATOR}, "\\"sourceFields\\":", ${JSON_OBJECT_START},
        ${concatJsonObjectPropertyEsqlExprAsString('entity.id', 'entity.id')},
      ${JSON_OBJECT_END},
    ${JSON_OBJECT_END},
  ${JSON_OBJECT_END})
// Build enriched targets doc data with entity metadata
| EVAL targetDocData = CONCAT(${JSON_OBJECT_START},
    ${concatJsonObjectPropertyEsqlExprSafe('id', '_target_id')},
    ${JSON_OBJECT_SEPARATOR}, ${concatJsonObjectPropertyString('type', 'entity')},
    ${JSON_OBJECT_SEPARATOR}, "\\"entity\\":", ${JSON_OBJECT_START},
    ${concatJsonObjectPropertyEsqlExpr(
      'availableInEntityStore',
      'CASE(_target_name IS NOT NULL OR _target_type IS NOT NULL, "true", "false")'
    )},
    CASE(_target_name IS NOT NULL, CONCAT(${JSON_OBJECT_SEPARATOR},
      ${concatJsonObjectPropertyEsqlExprAsString('name', '_target_name')}), ""),
    CASE(_target_type IS NOT NULL, CONCAT(${JSON_OBJECT_SEPARATOR},
      ${concatJsonObjectPropertyEsqlExprAsString('type', '_target_type')}), ""),
    CASE(_target_sub_type IS NOT NULL, CONCAT(${JSON_OBJECT_SEPARATOR},
      ${concatJsonObjectPropertyEsqlExprAsString('sub_type', '_target_sub_type')}), ""),
    CASE(
      _target_host_ip IS NOT NULL,
      CONCAT(${JSON_OBJECT_SEPARATOR}, "\\"host\\":", ${JSON_OBJECT_START},
        "\\"ip\\":\\"", TO_STRING(_target_host_ip), "\\"",
        ${JSON_OBJECT_END}),
      ""
    ),
    CASE(_target_engine_metadata_type IS NOT NULL, CONCAT(${JSON_OBJECT_SEPARATOR},
      ${concatJsonObjectPropertyEsqlExprAsString(
        'engine_type',
        '_target_engine_metadata_type'
      )}), ""),
    ${JSON_OBJECT_SEPARATOR}, "\\"sourceFields\\":", ${JSON_OBJECT_START},
      ${concatJsonObjectPropertyEsqlExprAsString('entity.id', '_target_id')},
    ${JSON_OBJECT_END},
  ${JSON_OBJECT_END},
${JSON_OBJECT_END})
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

export const fetchEntities = async ({
  esClient,
  logger,
  entityIds,
  spaceId,
}: {
  esClient: IScopedClusterClient;
  logger: Logger;
  entityIds: EntityId[];
  spaceId: string;
}): Promise<EsqlToRecords<EntityRecord>> => {
  const indexName = getEntitiesLatestIndexName(spaceId);

  logger.trace(`Fetching entities from index [${indexName}] for ${entityIds.length} entities`);
  const esqlQuery = `FROM ${indexName}
    | WHERE entity.id IN (${entityIds.map((_, idx) => `?entityId${idx}`).join(',')})
    | EVAL id = entity.id
    | EVAL name = entity.name
    | EVAL type = entity.type
    | EVAL sub_type = entity.sub_type
    | EVAL docData = CONCAT(${JSON_OBJECT_START},
      ${concatJsonObjectPropertyEsqlExprAsString('id', 'entity.id')},
      ${JSON_OBJECT_SEPARATOR}, ${concatJsonObjectPropertyString('type', 'entity')},
      ${JSON_OBJECT_SEPARATOR}, "\\"entity\\":", ${JSON_OBJECT_START},
        ${concatJsonObjectPropertyBool('availableInEntityStore', true)},
        CASE(entity.name IS NOT NULL, CONCAT(${JSON_OBJECT_SEPARATOR},
          ${concatJsonObjectPropertyEsqlExprAsString('name', 'entity.name')}), ""),
        CASE(entity.type IS NOT NULL, CONCAT(${JSON_OBJECT_SEPARATOR},
          ${concatJsonObjectPropertyEsqlExprAsString('type', 'entity.type')}), ""),
        CASE(entity.sub_type IS NOT NULL, CONCAT(${JSON_OBJECT_SEPARATOR},
          ${concatJsonObjectPropertyEsqlExprAsString('sub_type', 'entity.sub_type')}), ""),
        CASE(entity.EngineMetadata.Type IS NOT NULL, CONCAT(${JSON_OBJECT_SEPARATOR},
          ${concatJsonObjectPropertyEsqlExprAsString(
            'engine_type',
            'entity.EngineMetadata.Type'
          )}), ""),
        CASE(
          host.ip IS NOT NULL,
          CONCAT(${JSON_OBJECT_SEPARATOR}, "\\"host\\":", ${JSON_OBJECT_START},
            "\\"ip\\":\\"", TO_STRING(host.ip), "\\"",
            ${JSON_OBJECT_END}),
          ""
        ),
        ${JSON_OBJECT_SEPARATOR}, "\\"sourceFields\\":", ${JSON_OBJECT_START},
          ${concatJsonObjectPropertyEsqlExprAsString('entity.id', 'entity.id')},
        ${JSON_OBJECT_END},
      ${JSON_OBJECT_END},
    ${JSON_OBJECT_END})
    | KEEP id, name, type, sub_type, docData`;
  logger.trace(`Entities ES|QL query: ${esqlQuery}`);

  try {
    const response = await esClient.asCurrentUser.helpers
      .esql({
        columnar: false,
        query: esqlQuery,
        // @ts-ignore - types are not up to date
        params: [...entityIds.map((entity, idx) => ({ [`entityId${idx}`]: entity.id }))],
      })
      .toRecords<EntityRecord>();

    logger.trace(`Fetched [${response.records.length}] entity records`);
    return response;
  } catch (error) {
    // If the index doesn't exist, return empty result
    if (error.statusCode === 404) {
      logger.debug(`Entities index ${indexName} does not exist, skipping entities fetch`);
      return { columns: [], records: [] };
    }
    throw error;
  }
};
