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
import { INDEX_PATTERN_REGEX } from '@kbn/cloud-security-posture-common/schema/graph/v1';
import { getEnrichPolicyId } from '@kbn/cloud-security-posture-common/utils/helpers';
import type { EsQuery, GraphEdge, OriginEventId } from './types';

interface BuildEsqlQueryParams {
  indexPatterns: string[];
  originEventIds: OriginEventId[];
  originAlertIds: OriginEventId[];
  isEnrichPolicyExists: boolean;
  enrichPolicyName: string;
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
    enrichPolicyName: getEnrichPolicyId(spaceId),
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
  enrichPolicyName,
  alertsMappingsIncluded,
}: BuildEsqlQueryParams): string => {
  const SECURITY_ALERTS_PARTIAL_IDENTIFIER = '.alerts-security.alerts-';

  const originEventClause =
    originEventIds.length > 0
      ? `event.id in (${originEventIds.map((_id, idx) => `?og_id${idx}`).join(', ')})`
      : 'false';

  const originAlertClause =
    originAlertIds.length > 0
      ? `event.id in (${originAlertIds.map((_id, idx) => `?og_alrt_id${idx}`).join(', ')})`
      : 'false';

  const formattedIndexPatterns = indexPatterns
    .filter((indexPattern) => indexPattern.length > 0)
    .join(',');

  if (isEnrichPolicyExists) {
    return `FROM ${formattedIndexPatterns} METADATA _id, _index

| ENRICH ${enrichPolicyName} ON actor.entity.id WITH actorEntityName = entity.name, actorEntityType = entity.type
| ENRICH ${enrichPolicyName} ON target.entity.id WITH targetEntityName = entity.name, targetEntityType = entity.type

| WHERE event.action IS NOT NULL AND actor.entity.id IS NOT NULL
// Origin event and alerts allow us to identify the start position of graph traversal
| EVAL isOrigin = ${originEventClause}
| EVAL isOriginAlert = isOrigin AND ${originAlertClause}

// We format it as JSON string, the best alternative so far. Tried to use tuple using MV_APPEND
// but it flattens the data and we lose the structure
// Aggregate document's data for popover expansion and metadata enhancements
| EVAL isAlert = _index LIKE "*${SECURITY_ALERTS_PARTIAL_IDENTIFIER}*"
| EVAL docType = CASE (isAlert, "${DOCUMENT_TYPE_ALERT}", "${DOCUMENT_TYPE_EVENT}")
| EVAL docData = CONCAT("{",
    "\\"id\\":\\"", _id, "\\"",
    ",\\"type\\":\\"", docType, "\\"",
    ",\\"index\\":\\"", _index, "\\"",
  "}")
    ${
      alertsMappingsIncluded
        ? `CASE (isAlert, CONCAT(",\\"alert\\":", "{",
      "\\"ruleName\\":\\"", kibana.alert.rule.name, "\\"",
    "}"), ""),`
        : ''
    }

// Contact actor and target entities data
| EVAL actorDocData = CONCAT("{",
    "\\"id\\":\\"", actor.entity.id, "\\"",
    ",\\"type\\":\\"", "entity", "\\"",
    ",\\"entity\\":", "{",
      "\\"name\\":\\"", actorEntityName, "\\"",
      ",\\"type\\":\\"", actorEntityType, "\\"",
    "}",
  "}")
| EVAL targetDocData = CONCAT("{",
    "\\"id\\":\\"", target.entity.id, "\\"",
    ",\\"type\\":\\"", "entity", "\\"",
    ",\\"entity\\":", "{",
      "\\"name\\":\\"", targetEntityName, "\\"",
      ",\\"type\\":\\"", targetEntityType, "\\"",
    "}",
  "}")

| STATS badge = COUNT(*),
  docs = VALUES(docData),
  actorsDocData = VALUES(actorDocData),
  targetsDocData = VALUES(targetDocData),
  isAlert = MV_MAX(VALUES(isAlert))
    BY actorIds = actor.entity.id,
      action = event.action,
      targetIds = target.entity.id,
      isOrigin,
      isOriginAlert

| LIMIT 1000
| SORT isOrigin DESC, action`;
  } else {
    // Query WITHOUT entity enrichment - simpler case
    return `FROM ${formattedIndexPatterns} METADATA _id, _index

| WHERE event.action IS NOT NULL AND actor.entity.id IS NOT NULL
// Origin event and alerts allow us to identify the start position of graph traversal
| EVAL isOrigin = ${originEventClause}
| EVAL isOriginAlert = isOrigin AND ${originAlertClause}

// Aggregate document's data for popover expansion and metadata enhancements
| EVAL isAlert = _index LIKE "*${SECURITY_ALERTS_PARTIAL_IDENTIFIER}*"
| EVAL docType = CASE (isAlert, "${DOCUMENT_TYPE_ALERT}", "${DOCUMENT_TYPE_EVENT}")
| EVAL docData = CONCAT("{",
    "\\"id\\":\\"", _id, "\\"",
    ",\\"type\\":\\"", docType, "\\"",
    ",\\"index\\":\\"", _index, "\\"",
  "}")
    ${
      alertsMappingsIncluded
        ? `CASE (isAlert, CONCAT(",\\"alert\\":", "{",
      "\\"ruleName\\":\\"", kibana.alert.rule.name, "\\"",
    "}"), ""),`
        : ''
    }

| STATS badge = COUNT(*),
  docs = VALUES(docData),
  isAlert = MV_MAX(VALUES(isAlert))
    BY actorIds = actor.entity.id,
      action = event.action,
      targetIds = target.entity.id,
      isOrigin,
      isOriginAlert

| LIMIT 1000
| SORT isOrigin DESC, action`;
  }
};
