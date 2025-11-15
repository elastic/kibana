/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import type { EsqlToRecords } from '@elastic/elasticsearch/lib/helpers';
import { INDEX_PATTERN_REGEX } from '@kbn/cloud-security-posture-common/schema/graph/v1';
import { getEnrichPolicyId } from '@kbn/cloud-security-posture-common/utils/helpers';
import type { EsQuery, GraphEdge, OriginEventId } from './types';
import { buildEsqlQuery } from './esql_query_builder';

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

  // Filter out empty index patterns
  const validIndexPatterns = indexPatterns.filter((indexPattern) => indexPattern.length > 0);

  // If no valid index patterns, return empty result
  if (validIndexPatterns.length === 0) {
    logger.warn('No valid index patterns provided, returning empty result');
    return [] as unknown as EsqlToRecords<GraphEdge>;
  }

  const isEnrichPolicyExists = await checkEnrichPolicyExists(esClient, logger, spaceId);

  const query = buildEsqlQuery({
    indexPatterns: validIndexPatterns,
    originEventIds,
    originAlertIds,
    isEnrichPolicyExists,
    enrichPolicyName: getEnrichPolicyId(spaceId),
    securityAlertsIdentifier: '.alerts-security.alerts-',
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
