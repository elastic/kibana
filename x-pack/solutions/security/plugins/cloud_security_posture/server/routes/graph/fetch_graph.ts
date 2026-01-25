/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import {
  DOCUMENT_TYPE_ALERT,
  DOCUMENT_TYPE_EVENT,
} from '@kbn/cloud-security-posture-common/types/graph/v1';
import type { EsqlToRecords } from '@elastic/elasticsearch/lib/helpers';
import {
  DOCUMENT_TYPE_ENTITY,
  INDEX_PATTERN_REGEX,
} from '@kbn/cloud-security-posture-common/schema/graph/v1';
import {
  getEnrichPolicyId,
  getEntitiesLatestIndexName,
} from '@kbn/cloud-security-posture-common/utils/helpers';
import {
  ENTITY_RELATIONSHIP_FIELDS,
  GRAPH_ACTOR_ENTITY_FIELDS,
  GRAPH_TARGET_ENTITY_FIELDS,
} from '@kbn/cloud-security-posture-common/constants';
import {
  generateFieldHintCases,
  formatJsonProperty,
  buildLookupJoinEsql,
  buildEnrichPolicyEsql,
} from './utils';
import type { EsQuery, EntityId, GraphEdge, OriginEventId, RelationshipEdge } from './types';

interface BuildEsqlQueryParams {
  indexPatterns: string[];
  originEventIds: OriginEventId[];
  originAlertIds: OriginEventId[];
  isLookupIndexAvailable: boolean;
  isEnrichPolicyExists: boolean;
  spaceId: string;
  alertsMappingsIncluded: boolean;
}

export const fetchGraph = async ({
  esClient,
  logger,
  start,
  end,
  originEventIds,
  showUnknownTarget,
  indexPatterns,
  spaceId,
  esQuery,
}: {
  esClient: IScopedClusterClient;
  logger: Logger;
  start: string | number;
  end: string | number;
  originEventIds: OriginEventId[];
  showUnknownTarget: boolean;
  indexPatterns: string[];
  spaceId: string;
  esQuery?: EsQuery;
}): Promise<EsqlToRecords<GraphEdge>> => {
  const originAlertIds = originEventIds.filter((originEventId) => originEventId.isAlert);

  // FROM clause currently doesn't support parameters, Therefore, we validate the index patterns to prevent injection attacks.
  // Regex to match invalid characters in index patterns: upper case characters, \, /, ?, ", <, >, |, (space), #, or ,
  indexPatterns.forEach((indexPattern, idx) => {
    if (!INDEX_PATTERN_REGEX.test(indexPattern)) {
      throw new Error(
        `Invalid index pattern [${indexPattern}] at index ${idx}. Cannot contain characters \\, /, ?, ", <, >, |, (space character), #, or ,`
      );
    }
  });

  // Check if the entities lookup index exists and is in lookup mode (preferred)
  // If not, fall back to checking if the enrich policy exists (deprecated)
  const isLookupIndexAvailable = await checkIfEntitiesIndexLookupMode(esClient, logger, spaceId);
  const isEnrichPolicyExists = isLookupIndexAvailable
    ? false
    : await checkEnrichPolicyExists(esClient, logger, spaceId);
  const SECURITY_ALERTS_PARTIAL_IDENTIFIER = '.alerts-security.alerts-';
  const alertsMappingsIncluded = indexPatterns.some((indexPattern) =>
    indexPattern.includes(SECURITY_ALERTS_PARTIAL_IDENTIFIER)
  );

  const query = buildEsqlQuery({
    indexPatterns,
    originEventIds,
    originAlertIds,
    isLookupIndexAvailable,
    isEnrichPolicyExists,
    spaceId,
    alertsMappingsIncluded,
  });

  logger.trace(`Executing query [${query}]`);

  const eventIds = originEventIds.map((originEventId) => originEventId.id);
  return await esClient.asCurrentUser.helpers
    .esql({
      columnar: false,
      filter: buildDslFilter(eventIds, showUnknownTarget, start, end, esQuery),
      query,
      // @ts-ignore - types are not up to date
      params: [
        ...originEventIds.map((originEventId, idx) => ({ [`og_id${idx}`]: originEventId.id })),
        ...originEventIds
          .filter((originEventId) => originEventId.isAlert)
          .map((originEventId, idx) => ({ [`og_alrt_id${idx}`]: originEventId.id })),
      ],
    })
    .toRecords<GraphEdge>();
};

const buildDslFilter = (
  eventIds: string[],
  showUnknownTarget: boolean,
  start: string | number,
  end: string | number,
  esQuery?: EsQuery
) => ({
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
      ...(showUnknownTarget
        ? []
        : [
            {
              bool: {
                should: GRAPH_TARGET_ENTITY_FIELDS.map((field) => ({ exists: { field } })),
                minimum_should_match: 1,
              },
            },
          ]),
      {
        bool: {
          should: [
            ...(esQuery?.bool.filter?.length ||
            esQuery?.bool.must?.length ||
            esQuery?.bool.should?.length ||
            esQuery?.bool.must_not?.length
              ? [esQuery]
              : []),
            {
              terms: {
                'event.id': eventIds,
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
    ],
  },
});

const checkEnrichPolicyExists = async (
  esClient: IScopedClusterClient,
  logger: Logger,
  spaceId: string
): Promise<boolean> => {
  try {
    const { policies } = await esClient.asInternalUser.enrich.getPolicy({
      name: getEnrichPolicyId(spaceId),
    });

    logger.debug(
      `Enrich policy check for [${getEnrichPolicyId(spaceId)}]: found ${
        policies?.length
      } policies, policies: ${JSON.stringify(policies?.map((p) => p.config.match?.name))}`
    );
    return policies.some((policy) => policy.config.match?.name === getEnrichPolicyId(spaceId));
  } catch (error) {
    logger.error(`Error fetching enrich policy ${error.message}`);
    logger.error(error);
    return false;
  }
};

/**
 * Checks if the entities latest index exists and is configured in lookup mode.
 * This is the preferred method for entity enrichment (replaces deprecated ENRICH policy).
 */
const checkIfEntitiesIndexLookupMode = async (
  esClient: IScopedClusterClient,
  logger: Logger,
  spaceId: string
): Promise<boolean> => {
  const indexName = getEntitiesLatestIndexName(spaceId);
  try {
    const response = await esClient.asInternalUser.indices.getSettings({
      index: indexName,
    });
    const indexSettings = response[indexName];
    if (!indexSettings) {
      logger.debug(`Entities index ${indexName} not found`);
      return false;
    }

    // Check if index is in lookup mode
    const mode = indexSettings.settings?.index?.mode;
    const isLookupMode = mode === 'lookup';

    if (!isLookupMode) {
      logger.debug(`Entities index ${indexName} exists but is not in lookup mode (mode: ${mode})`);
    }

    return isLookupMode;
  } catch (error) {
    if (error.statusCode === 404) {
      logger.debug(`Entities index ${indexName} does not exist`);
      return false;
    }
    logger.error(`Error checking entities index ${indexName}: ${error.message}`);
    return false;
  }
};

/**
 * Generates ESQL statements for building entity fields with enrichment data.
 * This is used when entity store enrichment is available (via LOOKUP JOIN or ENRICH).
 * Uses REPLACE to fix "{," pattern that occurs when first property is null.
 */
const buildEnrichedEntityFieldsEsql = (): string => {
  return `// Construct actor and target entities data
// Build entity field conditionally - only include fields that have values
// Put required fields first (no comma prefix), optional fields use comma prefix
| EVAL actorEntityField = CASE(
    actorEntityName IS NOT NULL OR actorEntityType IS NOT NULL OR actorEntitySubType IS NOT NULL,
    CONCAT(",\\"entity\\":", "{",
      "\\"availableInEntityStore\\":true",
      ",\\"ecsParentField\\":\\"", actorEntityFieldHint, "\\"",
      ${formatJsonProperty('name', 'actorEntityName')},
      ${formatJsonProperty('type', 'actorEntityType')},
      ${formatJsonProperty('sub_type', 'actorEntitySubType')},
      CASE(
        actorHostIp IS NOT NULL,
        CONCAT(",\\"host\\":", "{", "\\"ip\\":\\"", TO_STRING(actorHostIp), "\\"", "}"),
        ""
      ),
    "}"),
    CONCAT(",\\"entity\\":", "{",
      "\\"availableInEntityStore\\":false",
      ",\\"ecsParentField\\":\\"", actorEntityFieldHint, "\\"",
    "}")
  )
| EVAL targetEntityField = CASE(
    targetEntityName IS NOT NULL OR targetEntityType IS NOT NULL OR targetEntitySubType IS NOT NULL,
    CONCAT(",\\"entity\\":", "{",
      "\\"availableInEntityStore\\":true",
      ",\\"ecsParentField\\":\\"", targetEntityFieldHint, "\\"",
      ${formatJsonProperty('name', 'targetEntityName')},
      ${formatJsonProperty('type', 'targetEntityType')},
      ${formatJsonProperty('sub_type', 'targetEntitySubType')},
      CASE(
        targetHostIp IS NOT NULL,
        CONCAT(",\\"host\\":", "{", "\\"ip\\":\\"", TO_STRING(targetHostIp), "\\"", "}"),
        ""
      ),
    "}"),
    CONCAT(",\\"entity\\":", "{",
      "\\"availableInEntityStore\\":false",
      ",\\"ecsParentField\\":\\"", targetEntityFieldHint, "\\"",
    "}")
  )`;
};

const buildEsqlQuery = ({
  indexPatterns,
  originEventIds,
  originAlertIds,
  isLookupIndexAvailable,
  isEnrichPolicyExists,
  spaceId,
  alertsMappingsIncluded,
}: BuildEsqlQueryParams): string => {
  const SECURITY_ALERTS_PARTIAL_IDENTIFIER = '.alerts-security.alerts-';
  const enrichPolicyName = getEnrichPolicyId(spaceId);

  const actorFieldsCoalesce = GRAPH_ACTOR_ENTITY_FIELDS.join(',\n    ');

  // Generate target entity ID collection logic
  // All fields use the same pattern: only append if not null
  // This ensures we filter out null values and only collect actual target entity IDs
  const targetEntityIdEvals = [
    // Initialize targetEntityId as null
    '| EVAL targetEntityId = TO_STRING(null)',
    // For each target field, append if not null
    ...GRAPH_TARGET_ENTITY_FIELDS.map((field) => {
      return `| EVAL targetEntityId = CASE(
    ${field} IS NULL,
    targetEntityId,
    CASE(
      targetEntityId IS NULL,
      ${field},
      MV_DEDUPE(MV_APPEND(targetEntityId, ${field}))
    )
  )`;
    }),
  ].join('\n');

  // Generate actor and target field hint CASE statements
  const actorFieldHintCases = generateFieldHintCases(GRAPH_ACTOR_ENTITY_FIELDS, 'actorEntityId');
  const targetFieldHintCases = generateFieldHintCases(GRAPH_TARGET_ENTITY_FIELDS, 'targetEntityId');

  const query = `FROM ${indexPatterns
    .filter((indexPattern) => indexPattern.length > 0)
    .join(',')} METADATA _id, _index
| EVAL actorEntityId = COALESCE(
    ${actorFieldsCoalesce}
  )
| WHERE event.action IS NOT NULL AND actorEntityId IS NOT NULL
| EVAL actorEntityId = COALESCE(
    ${actorFieldsCoalesce}
  )
${targetEntityIdEvals}
| MV_EXPAND actorEntityId
| MV_EXPAND targetEntityId
| EVAL actorEntityFieldHint = CASE(
${actorFieldHintCases},
    ""
  )
| EVAL targetEntityFieldHint = CASE(
${targetFieldHintCases},
    ""
)
${
  isLookupIndexAvailable
    ? `
${buildLookupJoinEsql(getEntitiesLatestIndexName(spaceId))}

${buildEnrichedEntityFieldsEsql()}
`
    : isEnrichPolicyExists
    ? `
${buildEnrichPolicyEsql(enrichPolicyName)}

${buildEnrichedEntityFieldsEsql()}
`
    : `
| EVAL actorEntityField = CONCAT(",\\"entity\\":", "{",
    "\\"availableInEntityStore\\":false",
    ",\\"ecsParentField\\":\\"", actorEntityFieldHint, "\\"",
  "}")
| EVAL targetEntityField = CONCAT(",\\"entity\\":", "{",
    "\\"availableInEntityStore\\":false",
    ",\\"ecsParentField\\":\\"", targetEntityFieldHint, "\\"",
  "}")
// Fallback to null string with non-enriched entity metadata
| EVAL actorEntityName = TO_STRING(null)
| EVAL actorEntityType = TO_STRING(null)
| EVAL actorEntitySubType = TO_STRING(null)
| EVAL actorHostIp = TO_STRING(null)
| EVAL targetEntityName = TO_STRING(null)
| EVAL targetEntityType = TO_STRING(null)
| EVAL targetEntitySubType = TO_STRING(null)
| EVAL targetHostIp = TO_STRING(null)
`
}
// Create actor and target data with entity data

| EVAL actorDocData = CONCAT("{",
    "\\"id\\":\\"", actorEntityId, "\\"",
    ",\\"type\\":\\"", "${DOCUMENT_TYPE_ENTITY}", "\\"",
    actorEntityField,
  "}")
| EVAL targetDocData = CONCAT("{",
    "\\"id\\":\\"", COALESCE(targetEntityId, ""), "\\"",
    ",\\"type\\":\\"", "${DOCUMENT_TYPE_ENTITY}", "\\"",
    targetEntityField,
  "}")

// Map host and source values to enriched contextual data
| EVAL sourceIps = source.ip
| EVAL sourceCountryCodes = source.geo.country_iso_code
// Origin event and alerts allow us to identify the start position of graph traversal
| EVAL isOrigin = ${
    originEventIds.length > 0
      ? `COALESCE(event.id in (${originEventIds
          .map((_id, idx) => `?og_id${idx}`)
          .join(', ')}), false)`
      : 'false'
  }
| EVAL isOriginAlert = ${
    originAlertIds.length > 0
      ? `COALESCE(isOrigin AND event.id in (${originAlertIds
          .map((_id, idx) => `?og_alrt_id${idx}`)
          .join(', ')}), false)`
      : 'false'
  }
| EVAL isAlert = _index LIKE "*${SECURITY_ALERTS_PARTIAL_IDENTIFIER}*"
// Aggregate document's data for popover expansion and metadata enhancements
// We format it as JSON string, the best alternative so far. Tried to use tuple using MV_APPEND
// but it flattens the data and we lose the structure
| EVAL docType = CASE (isAlert, "${DOCUMENT_TYPE_ALERT}", "${DOCUMENT_TYPE_EVENT}")
| EVAL docData = CONCAT("{",
    "\\"id\\":\\"", _id, "\\"",
    CASE (event.id IS NOT NULL AND event.id != "", CONCAT(",\\"event\\":","{","\\"id\\":\\"", event.id, "\\"","}"), ""),
    ",\\"type\\":\\"", docType, "\\"",
    ",\\"index\\":\\"", _index, "\\"",
    ${
      // ESQL complains about missing field's mapping when we don't fetch from alerts index
      alertsMappingsIncluded
        ? `CASE (isAlert, CONCAT(",\\"alert\\":", "{",
      "\\"ruleName\\":\\"", kibana.alert.rule.name, "\\"",
    "}"), ""),`
        : ''
    }
  "}")
| STATS badge = COUNT(*),
  uniqueEventsCount = COUNT_DISTINCT(CASE(isAlert == false, _id, null)),
  uniqueAlertsCount = COUNT_DISTINCT(CASE(isAlert == true, _id, null)),
  isAlert = MV_MAX(VALUES(isAlert)),
  docs = VALUES(docData),
  sourceIps = MV_DEDUPE(VALUES(sourceIps)),
  sourceCountryCodes = MV_DEDUPE(VALUES(sourceCountryCodes)),
  // actor attributes
  actorNodeId = CASE(
    // deterministic group IDs - use raw entity ID for single values, MD5 hash for multiple
    MV_COUNT(VALUES(actorEntityId)) == 1, TO_STRING(VALUES(actorEntityId)),
    MD5(MV_CONCAT(MV_SORT(VALUES(actorEntityId)), ","))
  ),
  actorIdsCount = COUNT_DISTINCT(actorEntityId),
  actorEntityName = VALUES(actorEntityName),
  actorHostIp = VALUES(actorHostIp),
  actorsDocData = VALUES(actorDocData),
  // target attributes
  targetNodeId = CASE(
    // deterministic group IDs - use raw entity ID for single values, MD5 hash for multiple
    COUNT_DISTINCT(targetEntityId) == 0, null,
    CASE(
      MV_COUNT(VALUES(targetEntityId)) == 1, TO_STRING(VALUES(targetEntityId)),
      MD5(MV_CONCAT(MV_SORT(VALUES(targetEntityId)), ","))
    )
  ),
  targetIdsCount = COUNT_DISTINCT(targetEntityId),
  targetEntityName = VALUES(targetEntityName),
  targetHostIp = VALUES(targetHostIp),
  targetsDocData = VALUES(targetDocData)
    BY action = event.action,
      actorEntityType,
      actorEntitySubType,
      targetEntityType,
      targetEntitySubType,
      isOrigin,
      isOriginAlert
| LIMIT 1000
| SORT action DESC, isOrigin`;

  return query;
};

interface BuildRelationshipsEsqlQueryParams {
  indexName: string;
  relationshipFields: readonly string[];
  isLookupIndexAvailable: boolean;
  spaceId: string;
}

/**
 * Builds ES|QL query for fetching entity relationships from the generic entities index.
 * Uses FORK to expand each relationship field and aggregates results.
 * The relationshipQuery filter is applied via the DSL filter parameter.
 * Conditionally includes LOOKUP JOIN, ENRICH, or fallback for target entity enrichment.
 */
const buildRelationshipsEsqlQuery = ({
  indexName,
  relationshipFields,
  isLookupIndexAvailable,
  spaceId,
}: BuildRelationshipsEsqlQueryParams): string => {
  const enrichPolicyName = getEnrichPolicyId(spaceId);

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
        `  (MV_EXPAND entity.relationships.${field} | EVAL _relationship = "${field}" | EVAL _target_id = entity.relationships.${field} | DROP entity.relationships.*)`
    )
    .join('\n');

  // Build enrichment section based on available method
  // Since we're querying the entity store index, either lookup mode or enrich policy should be available
  // We need to store source entity fields before LOOKUP JOIN as they get overwritten
  const enrichmentSection = isLookupIndexAvailable
    ? `// Store source entity fields before lookup (they get overwritten by target entity fields)
| RENAME _source_id = entity.id
| RENAME _source_name = entity.name
| RENAME _source_type = entity.type
| RENAME _source_sub_type = entity.sub_type
// Lookup target entity metadata
| EVAL entity.id = _target_id
| LOOKUP JOIN ${indexName} ON entity.id
| RENAME _target_name = entity.name
| RENAME _target_type = entity.type
| RENAME _target_sub_type = entity.sub_type
// Restore source entity fields
| RENAME entity.id = _source_id
| RENAME entity.name = _source_name
| RENAME entity.type = _source_type
| RENAME entity.sub_type = _source_sub_type`
    : `// Enrich target entity metadata using enrich policy
| ENRICH ${enrichPolicyName} ON _target_id WITH _target_name = entity.name, _target_type = entity.type, _target_sub_type = entity.sub_type`;

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
// Build enriched source doc data with entity metadata (from the queried entity)
| EVAL sourceDocData = CONCAT("{\\"id\\":\\"", entity.id, "\\",\\"type\\":\\"entity\\",\\"entity\\":{",
    CASE(entity.name IS NOT NULL, CONCAT("\\"name\\":\\"", entity.name, "\\","), ""),
    CASE(entity.type IS NOT NULL, CONCAT("\\"type\\":\\"", entity.type, "\\","), ""),
    CASE(entity.sub_type IS NOT NULL, CONCAT("\\"sub_type\\":\\"", entity.sub_type, "\\","), ""),
    "\\"availableInEntityStore\\":true",
    ",\\"ecsParentField\\":\\"${ecsParentFieldValue}\\"",
  "}}")
// Build enriched target doc data with entity metadata
| EVAL targetDocData = CONCAT("{\\"id\\":\\"", _target_id, "\\",\\"type\\":\\"entity\\",\\"entity\\":{",
    CASE(_target_name IS NOT NULL, CONCAT("\\"name\\":\\"", _target_name, "\\","), ""),
    CASE(_target_type IS NOT NULL, CONCAT("\\"type\\":\\"", _target_type, "\\","), ""),
    CASE(_target_sub_type IS NOT NULL, CONCAT("\\"sub_type\\":\\"", _target_sub_type, "\\","), ""),
    "\\"availableInEntityStore\\":", CASE(_target_name IS NOT NULL OR _target_type IS NOT NULL, "true", "false"),
    ",\\"ecsParentField\\":\\"${ecsParentFieldValue}\\"",
  "}}")
| STATS count = COUNT(*), targetIds = VALUES(_target_id), targetDocData = VALUES(targetDocData), sourceDocData = VALUES(sourceDocData)
    BY entity.id, _relationship`;
};

/**
 * Parses ES|QL response into RelationshipEdge records.
 */
const parseRelationshipRecords = (
  response: EsqlToRecords<Record<string, unknown>>
): RelationshipEdge[] => {
  const records: RelationshipEdge[] = [];

  for (const record of response.records) {
    const entityId = record['entity.id'] as string;
    const relationship = record._relationship as string;
    const count = record.count as number;
    const targetIds = Array.isArray(record.targetIds)
      ? (record.targetIds as string[])
      : [record.targetIds as string];
    // sourceDocData is a single value (same for all relationships from this entity)
    const sourceDocData = record.sourceDocData
      ? Array.isArray(record.sourceDocData)
        ? (record.sourceDocData[0] as string)
        : (record.sourceDocData as string)
      : undefined;
    const targetDocData = record.targetDocData
      ? Array.isArray(record.targetDocData)
        ? (record.targetDocData as string[])
        : [record.targetDocData as string]
      : undefined;

    records.push({
      entityId,
      relationship,
      count,
      targetIds,
      sourceDocData,
      targetDocData,
    });
  }

  return records;
};

/**
 * Builds a DSL filter for relationship queries from entityIds.
 * Creates a terms query on entity.id with all provided entity IDs.
 */
const buildRelationshipDslFilter = (entityIds: EntityId[]) => {
  if (!entityIds || entityIds.length === 0) {
    return undefined;
  }

  // Extract just the IDs for the terms query
  const ids = entityIds.map((entity) => entity.id);

  return {
    bool: {
      filter: [
        {
          terms: {
            'entity.id': ids,
          },
        },
      ],
    },
  };
};

/**
 * Fetches entity relationships from the generic entities index.
 * Queries for all relationship types for entities matching the provided entityIds.
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
}): Promise<RelationshipEdge[]> => {
  const indexName = getEntitiesLatestIndexName(spaceId);

  logger.trace(`Fetching relationships from index [${indexName}] for ${entityIds.length} entities`);

  // Check if the entities lookup index exists and is in lookup mode (preferred)
  // If not, fall back to using enrich policy (deprecated)
  const isLookupIndexAvailable = await checkIfEntitiesIndexLookupMode(esClient, logger, spaceId);

  const query = buildRelationshipsEsqlQuery({
    indexName,
    relationshipFields: ENTITY_RELATIONSHIP_FIELDS,
    isLookupIndexAvailable,
    spaceId,
  });
  const filter = buildRelationshipDslFilter(entityIds);

  logger.trace(`Relationships ES|QL query: ${query}`);
  logger.trace(`Relationships filter: ${JSON.stringify(filter)}`);

  try {
    const response = await esClient.asInternalUser.helpers
      .esql({
        columnar: false,
        filter,
        query,
      })
      .toRecords<Record<string, unknown>>();

    const records = parseRelationshipRecords(response);

    logger.trace(`Fetched [${records.length}] relationship records`);

    return records;
  } catch (error) {
    // If the index doesn't exist, return empty array
    if (error.statusCode === 404) {
      logger.debug(`Entities index ${indexName} does not exist, skipping relationship fetch`);
      return [];
    }
    logger.error(`Error fetching relationships: ${error.message}`);
    return [];
  }
};
