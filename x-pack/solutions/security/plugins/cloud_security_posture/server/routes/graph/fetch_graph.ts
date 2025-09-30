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
import { getEnrichPolicyId } from '@kbn/cloud-security-posture-common/utils/helpers';
import type { EsQuery, GraphEdge, OriginEventId } from './types';

interface BuildEsqlQueryParams {
  indexPatterns: string[];
  originEventIds: OriginEventId[];
  originAlertIds: OriginEventId[];
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

  const isEnrichPolicyExists = await checkEnrichPolicyExists(esClient, logger, spaceId);

  const SECURITY_ALERTS_PARTIAL_IDENTIFIER = '.alerts-security.alerts-';
  const alertsMappingsIncluded = indexPatterns.some((indexPattern) =>
    indexPattern.includes(SECURITY_ALERTS_PARTIAL_IDENTIFIER)
  );

  const query = buildEsqlQuery({
    indexPatterns,
    originEventIds,
    originAlertIds,
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
              exists: {
                field: 'target.entity.id',
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

    return policies.some((policy) => policy.config.match?.name === getEnrichPolicyId(spaceId));
  } catch (error) {
    logger.error(`Error fetching enrich policy ${error.message}`);
    logger.error(error);
    return false;
  }
};

const buildEsqlQuery = ({
  indexPatterns,
  originEventIds,
  originAlertIds,
  isEnrichPolicyExists,
  spaceId,
  alertsMappingsIncluded,
}: BuildEsqlQueryParams): string => {
  const SECURITY_ALERTS_PARTIAL_IDENTIFIER = '.alerts-security.alerts-';
  const enrichPolicyName = getEnrichPolicyId(spaceId);

  const query = `FROM ${indexPatterns
    .filter((indexPattern) => indexPattern.length > 0)
    .join(',')} METADATA _id, _index
| WHERE event.action IS NOT NULL AND actor.entity.id IS NOT NULL
${
  isEnrichPolicyExists
    ? `
| ENRICH ${enrichPolicyName} ON actor.entity.id WITH actorEntityName = entity.name, actorEntityType = entity.type, actorEntitySubType = entity.sub_type, actorHostIp = host.ip
| ENRICH ${enrichPolicyName} ON target.entity.id WITH targetEntityName = entity.name, targetEntityType = entity.type, targetEntitySubType = entity.sub_type, targetHostIp = host.ip

// Construct actor and target entities data
| EVAL actorDocData = CONCAT("{",
    "\\"id\\":\\"", actor.entity.id, "\\"",
    ",\\"type\\":\\"", "${DOCUMENT_TYPE_ENTITY}", "\\"",
    ",\\"entity\\":", "{",
      "\\"name\\":\\"", actorEntityName, "\\"",
      ",\\"type\\":\\"", actorEntityType, "\\"",
      ",\\"sub_type\\":\\"", actorEntitySubType, "\\"",
      CASE (
        actorHostIp IS NOT NULL,
        CONCAT(",\\"host\\":", "{", "\\"ip\\":\\"", TO_STRING(actorHostIp), "\\"", "}"),
        ""
      ),
    "}",
  "}")
| EVAL targetDocData = CONCAT("{",
    "\\"id\\":\\"", target.entity.id, "\\"",
    ",\\"type\\":\\"", "${DOCUMENT_TYPE_ENTITY}", "\\"",
    ",\\"entity\\":", "{",
      "\\"name\\":\\"", targetEntityName, "\\"",
      ",\\"type\\":\\"", targetEntityType, "\\"",
      ",\\"sub_type\\":\\"", targetEntitySubType, "\\"",
      CASE (
        targetHostIp IS NOT NULL,
        CONCAT(",\\"host\\":", "{", "\\"ip\\":\\"", TO_STRING(targetHostIp), "\\"", "}"),
        ""
      ),
    "}",
  "}")
// Map host and source values to enriched contextual data
| EVAL sourceIps = source.ip
| EVAL sourceCountryCodes = source.geo.country_iso_code`
    : `
// Fallback to null string with non-enriched actor
| EVAL actorEntityType = TO_STRING(null)
| EVAL actorEntitySubType = TO_STRING(null)
| EVAL actorHostIp = TO_STRING(null)
| EVAL actorDocData = TO_STRING(null)

// Fallback to null string with non-enriched target
| EVAL targetEntityType = TO_STRING(null)
| EVAL targetEntitySubType = TO_STRING(null)
| EVAL targetHostIp = TO_STRING(null)
| EVAL targetDocData = TO_STRING(null)

// Fallback to null string with non-enriched host and source data
| EVAL sourceIps = TO_STRING(null)
| EVAL sourceCountryCodes = TO_STRING(null)
`
}
// Origin event and alerts allow us to identify the start position of graph traversal
| EVAL isOrigin = ${
    originEventIds.length > 0
      ? `event.id in (${originEventIds.map((_id, idx) => `?og_id${idx}`).join(', ')})`
      : 'false'
  }
| EVAL isOriginAlert = isOrigin AND ${
    originAlertIds.length > 0
      ? `event.id in (${originAlertIds.map((_id, idx) => `?og_alrt_id${idx}`).join(', ')})`
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

// Construct actor and target entity groups
| EVAL actorEntityGroup = CASE(
    actorEntityType IS NOT NULL AND actorEntitySubType IS NOT NULL,
    CONCAT(actorEntityType, ":", actorEntitySubType),
    actorEntityType IS NOT NULL,
    actorEntityType,
    actor.entity.id
  )
| EVAL targetEntityGroup = CASE(
    targetEntityType IS NOT NULL AND targetEntitySubType IS NOT NULL,
    CONCAT(targetEntityType, ":", targetEntitySubType),
    targetEntityType IS NOT NULL,
    targetEntityType,
    target.entity.id
  )

| EVAL actorLabel = CASE(actorEntitySubType IS NOT NULL, actorEntitySubType, actor.entity.id)
| EVAL targetLabel = CASE(targetEntitySubType IS NOT NULL, targetEntitySubType, target.entity.id)
| EVAL actorEntityType = CASE(
    actorEntityType IS NOT NULL,
    actorEntityType,
    ""
  )
| EVAL targetEntityType = CASE(
    targetEntityType IS NOT NULL,
    targetEntityType,
    ""
  )
| STATS badge = COUNT(*),
  uniqueEventsCount = COUNT_DISTINCT(CASE(isAlert == false, event.id, null)),
  uniqueAlertsCount = COUNT_DISTINCT(CASE(isAlert == true, event.id, null)),
  isAlert = MV_MAX(VALUES(isAlert)),
  docs = VALUES(docData),
  sourceIps = MV_DEDUPE(VALUES(sourceIps)),
  sourceCountryCodes = MV_DEDUPE(VALUES(sourceCountryCodes)),
  // actor attributes
  actorEntityGroup = VALUES(actorEntityGroup),
  actorIds = VALUES(actor.entity.id),
  actorIdsCount = COUNT_DISTINCT(actor.entity.id),
  actorEntityType = VALUES(actorEntityType),
  actorLabel = VALUES(actorLabel),
  actorsDocData = VALUES(actorDocData),
  actorHostIp = VALUES(actorHostIp),
  // target attributes
  targetEntityGroup = VALUES(targetEntityGroup),
  targetIds = VALUES(target.entity.id),
  targetIdsCount = COUNT_DISTINCT(target.entity.id),
  targetEntityType = VALUES(targetEntityType),
  targetLabel = VALUES(targetLabel),
  targetsDocData = VALUES(targetDocData)
    BY action = event.action,
      actorEntityGroup,
      targetEntityGroup,
      isOrigin,
      isOriginAlert
| LIMIT 1000
| SORT action DESC, actorEntityGroup, targetEntityGroup, isOrigin`;

  return query;
};
