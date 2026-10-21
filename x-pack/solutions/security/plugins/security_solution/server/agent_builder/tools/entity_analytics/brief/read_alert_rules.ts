/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { truncate } from 'lodash';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ALERT_RULE_NAME, ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import { DEFAULT_ALERTS_INDEX } from '../../../../../common/constants';
import { ALERT_ENTITY_ID } from '../../../../../common/field_maps/field_names';
import { getPeriodStart } from './describe_scope';
import type { BriefCandidate, EntityAlerts } from './types';

const MAX_RULES_PER_ENTITY = 3;
/** Rule names are written by users, so a long one is cut. */
const MAX_RULE_NAME_LENGTH = 100;

interface AlertsByCandidate {
  byCandidate?: {
    buckets: Record<
      string,
      { doc_count: number; rules: { buckets: Array<{ key: string; doc_count: number }> } }
    >;
  };
}

/**
 * The open alerts of each candidate in the captured period, and the rules behind most of them, as the
 * entities grid and the tiles count them. A group's alerts are its members' alerts, counted once. Alerts
 * are matched on the entity id they are stamped with. A failure, such as a user who can't read alerts,
 * means no rules, never a failed brief.
 */
export const readAlertRules = async ({
  candidates,
  scope,
  spaceId,
  esClient,
  logger,
}: {
  candidates: BriefCandidate[];
  scope: EntityAnalyticsScope;
  spaceId: string;
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<Record<string, EntityAlerts>> => {
  if (candidates.length === 0) {
    return {};
  }
  const idsByCandidateId = Object.fromEntries(
    candidates.map(({ id, memberIds = [] }) => [id, [id, ...memberIds]])
  );
  try {
    const response = await esClient.search<unknown, AlertsByCandidate>({
      index: `${DEFAULT_ALERTS_INDEX}-${spaceId}`,
      size: 0,
      ignore_unavailable: true,
      query: {
        bool: {
          filter: [
            { terms: { [ALERT_ENTITY_ID]: Object.values(idsByCandidateId).flat() } },
            {
              range: {
                '@timestamp': {
                  gte: getPeriodStart(scope).toISOString(),
                  lte: scope.capturedAt,
                },
              },
            },
          ],
          // An alert that isn't closed, as the tiles count it.
          must_not: [{ term: { [ALERT_WORKFLOW_STATUS]: 'closed' } }],
        },
      },
      aggs: {
        byCandidate: {
          filters: {
            filters: Object.fromEntries(
              Object.entries(idsByCandidateId).map(([id, ids]) => [
                id,
                { terms: { [ALERT_ENTITY_ID]: ids } },
              ])
            ),
          },
          aggs: { rules: { terms: { field: ALERT_RULE_NAME, size: MAX_RULES_PER_ENTITY } } },
        },
      },
    });
    return toAlertsByCandidateId(response.aggregations);
  } catch (error) {
    logger.debug(`AI brief: no alert rules: ${error.message}`);
    return {};
  }
};

/** The candidates that have alerts, with their rules, most alerts first. */
export const toAlertsByCandidateId = (
  aggregations: AlertsByCandidate | undefined
): Record<string, EntityAlerts> =>
  Object.fromEntries(
    Object.entries(aggregations?.byCandidate?.buckets ?? {}).flatMap(([id, bucket]) =>
      bucket.doc_count > 0
        ? [
            [
              id,
              {
                count: bucket.doc_count,
                rules: bucket.rules.buckets.map(({ key, doc_count: count }) => ({
                  name: truncate(key, { length: MAX_RULE_NAME_LENGTH }),
                  count,
                })),
              },
            ],
          ]
        : []
    )
  );
