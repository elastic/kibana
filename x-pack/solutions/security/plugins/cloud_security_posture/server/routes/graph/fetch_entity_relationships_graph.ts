/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import type { EsqlToRecords } from '@elastic/elasticsearch/lib/helpers';
import { getEntitiesLatestIndexName } from '@kbn/cloud-security-posture-common/utils/helpers';
import { ENTITY_RELATIONSHIP_FIELDS } from '@kbn/cloud-security-posture-common/constants';
import {
  type EuidSourceFields,
  GRAPH_ACTOR_EUID_SOURCE_FIELDS,
  TYPED_ENTITY_PREFIXES,
  RELATIONSHIP_FIELDS_FORK_BATCH_SIZE,
} from './constants';
import {
  concatJsonObjectPropertyBool,
  concatJsonObjectPropertyString,
  concatJsonObjectPropertyEsqlExprSafe,
  JSON_OBJECT_END,
  JSON_OBJECT_SEPARATOR,
  JSON_OBJECT_START,
  concatJsonObjectPropertyEsqlExprAsString,
  buildPinnedEsql,
} from './utils';
import type { EntityId, EntityRecord, RelationshipEsqlRow } from './types';

interface BuildRelationshipsEsqlQueryParams {
  indexName: string;
  relationshipFields: readonly string[];
  entityIds: EntityId[];
  pinnedIds?: string[];
}

const RESOLUTION_RELATIONSHIP_FIELD = 'resolution.resolved_to' as const;

/**
 * ECS relationship leaves store canonical target EUIDs under `entity.relationships.<leaf>.ids`
 * and raw dimensions under `entity.relationships.<leaf>.raw_identifiers.*` (dynamic bag).
 * Resolution still uses `entity.relationships.resolution.resolved_to`.
 */
const buildRelationshipTargetsEval = (field: string): string => {
  const col = `\`_rel_targets_${field}\``;
  if (field === RESOLUTION_RELATIONSHIP_FIELD) {
    return `${col} = COALESCE(\`entity.relationships.resolution.resolved_to\`, [""])`;
  }

  return `${col} = COALESCE(\`entity.relationships.${field}.ids\`, [""])`;
};

/**
 * Builds ES|QL query for fetching entity relationships from the generic entities index.
 * Uses FORK to expand each relationship field and aggregates results.
 * The filter is applied via the DSL filter parameter.
 * Target enrichment is applied later in TypeScript via fetchEntityEnrichment.
 *
 * After FORK expansion each row is filtered to only include relationships where the actor
 * or the target is one of the originally requested entity IDs. This prevents entities
 * fetched because they point TO a requested entity (via the DSL should clauses) from
 * leaking their unrelated outbound relationships into the result set.
 */
const buildRelationshipsEsqlQuery = ({
  indexName,
  relationshipFields,
  entityIds,
  pinnedIds,
}: BuildRelationshipsEsqlQueryParams): string => {
  const targetsEval = relationshipFields
    .map((field) => buildRelationshipTargetsEval(field))
    .join(',\n  ');

  // Build FORK branches: expand flattened targets per relationship leaf
  const forkBranches = relationshipFields
    .map((field) => {
      const col = `\`_rel_targets_${field}\``;
      return `  (MV_EXPAND ${col} | EVAL relationship = "${field}" | EVAL _target_id = TO_STRING(${col}) | DROP entity.relationships.*, ${col})`;
    })
    .join('\n');

  // Restrict rows to only those where the actor or target is one of the requested entity IDs.
  // Without this, entities fetched because they point TO a requested entity would expose all
  // of their own outbound relationships, not just the ones touching the requested entity.
  const idParams = entityIds.map((_, idx) => `?entityId${idx}`).join(', ');
  const relevantEntityFilter = `TO_STRING(entity.id) IN (${idParams}) OR _target_id IN (${idParams})`;

  return `SET unmapped_fields="nullify";
FROM ${indexName}
| EVAL _source_source_fields = ${buildSourceFieldsJson(GRAPH_ACTOR_EUID_SOURCE_FIELDS)}
| EVAL
  ${targetsEval}
| FORK
${forkBranches}
| WHERE _target_id != ""
| WHERE ${relevantEntityFilter}
// Build actors doc data with entity metadata (from the entity store source entity)
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
          "\\"ip\\":[\\"", MV_CONCAT(TO_STRING(host.ip), "\\",\\""), "\\"]",
          ${JSON_OBJECT_END}),
        ""
      ),
      ${JSON_OBJECT_SEPARATOR}, _source_source_fields,
    ${JSON_OBJECT_END},
  ${JSON_OBJECT_END})
// Target entity data built by TypeScript enrichment
| EVAL targetDocData = CONCAT(${JSON_OBJECT_START},
    ${concatJsonObjectPropertyEsqlExprSafe('id', '_target_id')},
    ${JSON_OBJECT_SEPARATOR}, ${concatJsonObjectPropertyString('type', 'entity')},
  ${JSON_OBJECT_END})
| EVAL actorId = TO_STRING(entity.id),
  targetId = TO_STRING(_target_id)
// Per-row actor → target mapping ("<actorId>\\n<targetId>"), collected via VALUES so that after
// STATS drops targetId (and actorId) from the group key we can still recover which actor pointed
// at which target. regroupRelationships uses this to split a merged same-type-actor row back into
// distinct relationship nodes when the actors point at different target sets — mirroring how
// fetch_events_graph uses targetDocMap to attribute targets to documents.
| EVAL actorTargetMap = CONCAT(actorId, "\\n", targetId)
| RENAME \`entity.type\` AS actorEntityType,
  \`entity.sub_type\` AS actorEntitySubType,
  \`entity.name\` AS actorEntityName,
  \`host.ip\` AS actorHostIps
${buildPinnedEsql(['actorId', 'targetId'], pinnedIds)}
// Pre-aggregate by the actor TYPE dimensions (NOT raw actorId — entity.id is unique per
// actor, so keying on it would never merge same-type actors). targetId is NOT a group key
// either: keying on it would emit one row per target and prevent same-type targets from
// collapsing into a single grouped target node. Instead every target that a same-(type, rel,
// pinned) actor group points at is collected via VALUES(targetId), and regroupRelationships
// performs the final split/merge by target type/sub-type (only known after the follow-up
// enrichment query) — mirroring how fetch_events_graph collects targetEntityId + targetDocMap.
// actorIds is collected via VALUES so the merged node's actorNodeId/actorIds[] can be rebuilt.
// actorEntityName uses MV_FIRST to preserve the prior single-name-per-node output.
| STATS badge = COUNT(*),
  actorIds = VALUES(actorId),
  targetIds = VALUES(targetId),
  actorTargetMap = VALUES(actorTargetMap),
  actorEntityName = MV_FIRST(VALUES(actorEntityName)),
  actorHostIps = VALUES(actorHostIps),
  actorDocData = VALUES(actorDocData),
  targetDocData = VALUES(targetDocData)
    BY actorEntityType,
      actorEntitySubType,
      relationship,
      pinned
| EVAL pinnedSort = CASE(pinned IS NULL, 1, 0)
| SORT relationship ASC, pinnedSort ASC
| DROP pinnedSort`;
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

  const relationshipQueries = ENTITY_RELATIONSHIP_FIELDS.map((field) => {
    if (field === RESOLUTION_RELATIONSHIP_FIELD) {
      return {
        terms: {
          'entity.relationships.resolution.resolved_to': ids,
        },
      };
    }

    return {
      terms: {
        [`entity.relationships.${field}.ids`]: ids,
      },
    };
  });

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
 * Note: Relationships require the v2 entity store; returns an empty result if the
 * entities index does not exist.
 *
 * ENTITY_RELATIONSHIP_FIELDS is batched into groups of at most
 * RELATIONSHIP_FIELDS_FORK_BATCH_SIZE (ES|QL FORK's branch limit) and each batch is issued as
 * its own ES|QL query; the batches run in parallel and their records are concatenated. Each
 * batch independently pre-aggregates via STATS BY (see buildRelationshipsEsqlQuery), so this
 * merge stays a strict refinement of the single-query grouping — a batch only narrows which
 * relationship fields are grouped together, and downstream regroupRelationships is unaffected.
 * A failure in any batch rejects the whole call, matching the existing all-or-nothing semantics.
 */
export const fetchEntityRelationships = async ({
  esClient,
  logger,
  entityIds,
  spaceId,
  entityStoreIndexExists,
  pinnedIds,
}: {
  esClient: IScopedClusterClient;
  logger: Logger;
  entityIds: EntityId[];
  spaceId: string;
  entityStoreIndexExists: boolean;
  pinnedIds?: string[];
}): Promise<EsqlToRecords<RelationshipEsqlRow>> => {
  if (!entityStoreIndexExists) {
    return { columns: [], records: [] };
  }

  const indexName = getEntitiesLatestIndexName(spaceId);
  logger.trace(`Fetching relationships from index [${indexName}] for ${entityIds.length} entities`);

  const filter = buildRelationshipDslFilter(entityIds);
  const params = [
    ...entityIds.map((entity, idx) => ({ [`entityId${idx}`]: entity.id })),
    ...(pinnedIds ?? []).map((id, idx) => ({ [`pinned_id${idx}`]: id })),
  ];

  const fieldBatches = chunk(ENTITY_RELATIONSHIP_FIELDS, RELATIONSHIP_FIELDS_FORK_BATCH_SIZE);

  const responses = await Promise.all(
    fieldBatches.map((relationshipFields) => {
      const query = buildRelationshipsEsqlQuery({
        indexName,
        relationshipFields,
        entityIds,
        pinnedIds,
      });

      logger.trace(`Relationships ES|QL query: ${query}`);
      logger.trace(`Relationships filter: ${JSON.stringify(filter)}`);

      return esClient.asCurrentUser.helpers
        .esql({
          columnar: false,
          filter,
          query,
          params,
        })
        .toRecords<RelationshipEsqlRow>();
    })
  );

  const records = responses.flatMap((response) => response.records);
  logger.trace(`Fetched [${records.length}] relationship records`);

  return { columns: responses[0]?.columns ?? [], records };
};

export const fetchEntities = async ({
  esClient,
  logger,
  entityIds,
  spaceId,
  entityStoreIndexExists,
}: {
  esClient: IScopedClusterClient;
  logger: Logger;
  entityIds: EntityId[];
  spaceId: string;
  entityStoreIndexExists: boolean;
}): Promise<EsqlToRecords<EntityRecord>> => {
  if (entityIds.length === 0 || !entityStoreIndexExists) {
    return { columns: [], records: [] };
  }

  const indexName = getEntitiesLatestIndexName(spaceId);

  logger.trace(`Fetching entities from index [${indexName}] for ${entityIds.length} entities`);
  const esqlQuery = `SET unmapped_fields="nullify";
    FROM ${indexName}
    | WHERE entity.id IN (${entityIds.map((_, idx) => `?entityId${idx}`).join(',')})
    | INLINE STATS __host_ip = VALUES(TO_STRING(host.ip)) // Extract host IPs as string type
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
            "\\"ip\\":[\\"", MV_CONCAT(__host_ip, "\\",\\""), "\\"]",
            ${JSON_OBJECT_END}),
          ""
        ),
        ${JSON_OBJECT_SEPARATOR}, ${buildSourceFieldsJson(GRAPH_ACTOR_EUID_SOURCE_FIELDS)},
      ${JSON_OBJECT_END},
    ${JSON_OBJECT_END})
    | KEEP id, name, type, sub_type, docData`;
  logger.trace(`Entities ES|QL query: ${esqlQuery}`);

  const response = await esClient.asCurrentUser.helpers
    .esql({
      columnar: false,
      query: esqlQuery,
      params: entityIds.map((entity, idx) => ({ [`entityId${idx}`]: entity.id })),
    })
    .toRecords<EntityRecord>();

  logger.trace(`Fetched [${response.records.length}] entity records`);
  return response;
};

const buildSourceFieldsJson = (fields: EuidSourceFields): string => {
  const properties = Object.keys(fields)
    .map((type) => {
      if (type === 'all') {
        return fields.all.map(
          (field) =>
            `CASE(${field} IS NOT NULL, ${concatJsonObjectPropertyEsqlExprSafe(field, field)}, "")`
        );
      } else if (type === 'generic') {
        // Generic entities don't have a type prefix in their EUID,
        // so use a negative condition to match them
        const notTypedCondition = TYPED_ENTITY_PREFIXES.map(
          (p) => `NOT STARTS_WITH(entity.id, "${p}:")`
        ).join(' AND ');
        return fields[type as keyof EuidSourceFields].map(
          (field) => `CASE(${notTypedCondition} AND ${field} IS NOT NULL,
            ${concatJsonObjectPropertyEsqlExprSafe(field.replace('.target', ''), field)}, "")`
        );
      } else {
        const typeEuidFields = fields[type as keyof EuidSourceFields];
        return typeEuidFields.map(
          (field) => `CASE(STARTS_WITH(entity.id, "${type}:") AND ${field} IS NOT NULL,
            ${concatJsonObjectPropertyEsqlExprSafe(field.replace('.target', ''), field)}, "")`
        );
      }
    })
    .flat()
    .join(`, ${JSON_OBJECT_SEPARATOR},\n      `);
  return `
  REPLACE(
    REPLACE(
      REPLACE(CONCAT("\\"sourceFields\\":", ${JSON_OBJECT_START}, ${properties}, ${JSON_OBJECT_END}), "[,]+", ","),
    "\\\\{,", ${JSON_OBJECT_START}),
  ",}", ${JSON_OBJECT_END})`;
};
