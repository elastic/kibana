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
  GRAPH_ACTOR_ENTITY_FIELDS,
  GRAPH_TARGET_ENTITY_FIELDS,
} from '@kbn/cloud-security-posture-common/constants';
import {
  generateFieldHintCases,
  formatJsonProperty,
  buildLookupJoinEsql,
  buildEnrichPolicyEsql,
  checkIfEntitiesIndexLookupMode,
} from './utils';
import type { EsQuery, OriginEventId, EventEdge } from './types';

interface BuildEsqlQueryParams {
  indexPatterns: string[];
  originEventIds: OriginEventId[];
  originAlertIds: OriginEventId[];
  isLookupIndexAvailable: boolean;
  isEnrichPolicyExists: boolean;
  spaceId: string;
  alertsMappingsIncluded: boolean;
}

/**
 * Fetches events/alerts from logs and alerts indices.
 * This is the core event fetching logic used by fetchGraph.
 */
export const fetchEvents = async ({
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
}): Promise<EsqlToRecords<EventEdge>> => {
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
    .toRecords<EventEdge>();
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
            // we might have no eventIds when opening from entity flyout
            ...(eventIds.length > 0
              ? [
                  {
                    terms: {
                      'event.id': eventIds,
                    },
                  },
                ]
              : []),
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
  // label node ID based on document IDs - ensures deduplication by documents, not actor-target pairs
  labelNodeId = CASE(
    MV_COUNT(VALUES(_id)) == 1, TO_STRING(VALUES(_id)),
    MD5(MV_CONCAT(MV_SORT(VALUES(_id)), ","))
  ),
  // actor attributes
  actorNodeId = CASE(
    // deterministic group IDs - use raw entity ID for single values, MD5 hash for multiple
    MV_COUNT(VALUES(actorEntityId)) == 1, TO_STRING(VALUES(actorEntityId)),
    MD5(MV_CONCAT(MV_SORT(VALUES(actorEntityId)), ","))
  ),
  actorIdsCount = COUNT_DISTINCT(actorEntityId),
  actorEntityName = VALUES(actorEntityName),
  actorHostIps = VALUES(actorHostIp),
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
  targetHostIps = VALUES(targetHostIp),
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
