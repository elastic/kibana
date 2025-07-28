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
import { GENERIC_ENTITY_INDEX_ENRICH_POLICY } from '../../../common/constants';
import type { EsQuery, GraphEdge, OriginEventId } from './types';

export const fetchGraph = async ({
  esClient,
  logger,
  start,
  end,
  originEventIds,
  showUnknownTarget,
  indexPatterns,
  esQuery,
  isAssetInventoryEnabled,
}: {
  esClient: IScopedClusterClient;
  logger: Logger;
  start: string | number;
  end: string | number;
  originEventIds: OriginEventId[];
  showUnknownTarget: boolean;
  indexPatterns: string[];
  esQuery?: EsQuery;
  isAssetInventoryEnabled?: boolean;
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

  let isEnrichPolicyExists = false;
  try {
    const { policies } = await esClient.asCurrentUser.enrich.getPolicy({
      name: GENERIC_ENTITY_INDEX_ENRICH_POLICY,
    });

    isEnrichPolicyExists = policies.some(
      (policy) => policy.config.match?.name === GENERIC_ENTITY_INDEX_ENRICH_POLICY
    );
  } catch (error) {
    logger.error(`Error fetching enrich policy ${error.message}`);
    logger.error(error);
    // If we can't check the policy, assume it doesn't exist and continue without enrichment
    isEnrichPolicyExists = false;
  }

  const SECURITY_ALERTS_PARTIAL_IDENTIFIER = '.alerts-security.alerts-';
  const alertsMappingsIncluded = indexPatterns.some((indexPattern) =>
    indexPattern.includes(SECURITY_ALERTS_PARTIAL_IDENTIFIER)
  );

  // Common parts of the query
  const originEventClause =
    originEventIds.length > 0
      ? `event.id in (${originEventIds.map((_id, idx) => `?og_id${idx}`).join(', ')})`
      : 'false';

  const originAlertClause =
    originAlertIds.length > 0
      ? `event.id in (${originAlertIds.map((_id, idx) => `?og_alrt_id${idx}`).join(', ')})`
      : 'false';

  // For now, we query only the generic entity index to infer types of entities (hosts/users/ips)
  // TODO: We should use the appropriate specific index for each entity type in the future
  let query: string;

  if (isAssetInventoryEnabled && isEnrichPolicyExists) {
    // Query with entity enrichment
    query = `FROM ${indexPatterns
      .filter((indexPattern) => indexPattern.length > 0)
      .join(',')} METADATA _id, _index
 | ENRICH ${GENERIC_ENTITY_INDEX_ENRICH_POLICY} ON actor.entity.id WITH actorEntityName = entity.name, actorEntityType = entity.type, actorSourceIndex = entity.source
 | ENRICH ${GENERIC_ENTITY_INDEX_ENRICH_POLICY} ON target.entity.id WITH targetEntityName = entity.name, targetEntityType = entity.type, targetSourceIndex = entity.source
| WHERE event.action IS NOT NULL AND actor.entity.id IS NOT NULL
// Origin event and alerts allow us to identify the start position of graph traversal
| EVAL isOrigin = ${originEventClause}
| EVAL isOriginAlert = isOrigin AND ${originAlertClause}
// Aggregate document's data for popover expansion and metadata enhancements
// We format it as JSON string, the best alternative so far. Tried to use tuple using MV_APPEND
// but it flattens the data and we lose the structure
| EVAL isAlert = _index LIKE "*${SECURITY_ALERTS_PARTIAL_IDENTIFIER}*"
| EVAL docType = CASE (isAlert, "${DOCUMENT_TYPE_ALERT}", "${DOCUMENT_TYPE_EVENT}")
| EVAL docData = CONCAT("{",
    "\\"id\\":\\"", _id, "\\"",
    ",\\"type\\":\\"", docType, "\\"",
    ",\\"index\\":\\"", _index, "\\"",
  "}")
    ${
      // ESQL complains about missing field's mapping when we don't fetch from alerts index
      alertsMappingsIncluded
        ? `CASE (isAlert, CONCAT(",\\"alert\\":", "{",
      "\\"ruleName\\":\\"", kibana.alert.rule.name, "\\"",
    "}"), ""),`
        : ''
    }
// contact actor and target entities data
| EVAL actorDocData = CONCAT("{",
    "\\"id\\":\\"", actor.entity.id, "\\"",
    ",\\"type\\":\\"", "entity", "\\"",
    ",\\"index\\":\\"", actorSourceIndex, "\\"",
    ",\\"entity\\":", "{",
      "\\"name\\":\\"", actorEntityName, "\\"",
      ",\\"type\\":\\"", actorEntityType, "\\"",
    "}",
  "}")
| EVAL targetDocData = CONCAT("{",
    "\\"id\\":\\"", target.entity.id, "\\"",
    ",\\"type\\":\\"", "entity", "\\"",
    ",\\"index\\":\\"", targetSourceIndex, "\\"",
    ",\\"entity\\":", "{",
      "\\"name\\":\\"", targetEntityName, "\\"",
      ",\\"type\\":\\"", targetEntityType, "\\"",
    "}",
  "}")
| STATS badge = COUNT(*),
  docs = VALUES(docData),
  actorsDocData = VALUES(actorDocData),
  targetsDocData = VALUES(targetDocData),
  ips = VALUES(related.ip),
  // hosts = VALUES(related.hosts),
  users = VALUES(related.user),
  isAlert = MV_MAX(VALUES(isAlert))
    BY actorIds = actor.entity.id,
      action = event.action,
      targetIds = target.entity.id,
      isOrigin,
      isOriginAlert
| LIMIT 1000
| SORT isOrigin DESC, action`;
  } else {
    // Query without entity enrichment
    query = `FROM ${indexPatterns
      .filter((indexPattern) => indexPattern.length > 0)
      .join(',')} METADATA _id, _index
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
      // ESQL complains about missing field's mapping when we don't fetch from alerts index
      alertsMappingsIncluded
        ? `CASE (isAlert, CONCAT(",\\"alert\\":", "{",
      "\\"ruleName\\":\\"", kibana.alert.rule.name, "\\"",
    "}"), ""),`
        : ''
    }
| STATS badge = COUNT(*),
  docs = VALUES(docData),
  ips = VALUES(related.ip),
  // hosts = VALUES(related.hosts),
  users = VALUES(related.user),
  isAlert = MV_MAX(VALUES(isAlert))
    BY actorIds = actor.entity.id,
      action = event.action,
      targetIds = target.entity.id,
      isOrigin,
      isOriginAlert
| LIMIT 1000
| SORT isOrigin DESC, action`;
  }

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
