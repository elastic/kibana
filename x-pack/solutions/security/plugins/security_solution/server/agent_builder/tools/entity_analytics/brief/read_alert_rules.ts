/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { truncate } from 'lodash';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  QueryDslBoolQuery,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import { ALERT_RISK_SCORE, ALERT_RULE_NAME, ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import { DEFAULT_ALERTS_INDEX } from '../../../../../common/constants';
import { ALERT_ENTITY_ID } from '../../../../../common/field_maps/field_names';
import { getPeriodStart } from './describe_scope';
import { buildRecordFilters } from './match_candidate_records';
import type { BriefCandidate, EntityAlerts } from './types';

/** The two most important rules are given to the model, and the rest are counted. */
const MAX_RULES_PER_ENTITY = 2;
/** Rule names are written by users, so a long one is cut. */
const MAX_RULE_NAME_LENGTH = 100;

interface AlertsByCandidate {
  byCandidate?: {
    buckets: Record<
      string,
      {
        doc_count: number;
        ruleCount: { value: number };
        rules: { buckets: Array<{ key: string; doc_count: number }> };
      }
    >;
  };
}

/**
 * The open alerts of each candidate in the captured period, and the rules behind most of them, as the
 * entities grid and the tiles count them. A group's alerts are its members' alerts, counted once. An
 * alert is matched on the entity id it is stamped with, and an alert without one on the identity fields
 * of the candidate's and its members' records. A failure, such as a user who can't read alerts, means no
 * rules and `isFailed`, never a failed brief.
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
}): Promise<{ alertsByEntityId: Record<string, EntityAlerts>; isFailed: boolean }> => {
  if (candidates.length === 0) {
    return { alertsByEntityId: {}, isFailed: false };
  }
  try {
    const filtersByCandidateId = Object.fromEntries(
      candidates.map((candidate) => [candidate.id, buildAlertsFilter(candidate)])
    );
    const response = await esClient.search<unknown, AlertsByCandidate>({
      index: `${DEFAULT_ALERTS_INDEX}-${spaceId}`,
      size: 0,
      ignore_unavailable: true,
      query: {
        bool: {
          filter: [
            {
              bool: {
                // Stamped for a candidate or its member, or not stamped, as the tiles read them.
                should: [
                  {
                    terms: { [ALERT_ENTITY_ID]: candidates.flatMap(getEntityIds) },
                  },
                  { bool: { must_not: [{ exists: { field: ALERT_ENTITY_ID } }] } },
                ],
                minimum_should_match: 1,
              },
            },
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
            filters: filtersByCandidateId,
          },
          aggs: {
            rules: buildRulesAggregation(),
            ruleCount: { cardinality: { field: ALERT_RULE_NAME } },
          },
        },
      },
    });
    return { alertsByEntityId: toAlertsByCandidateId(response.aggregations), isFailed: false };
  } catch (error) {
    logger.debug(`AI brief: no alert rules: ${error.message}`);
    return { alertsByEntityId: {}, isFailed: true };
  }
};

/** The rules whose alerts have the highest risk score first, then the most alerts. */
export const buildRulesAggregation = () => ({
  terms: {
    field: ALERT_RULE_NAME,
    size: MAX_RULES_PER_ENTITY,
    order: [{ highestRiskScore: 'desc' as const }, { _count: 'desc' as const }],
  },
  aggs: { highestRiskScore: { max: { field: ALERT_RISK_SCORE } } },
});

/** The ids of a candidate and its members. */
const getEntityIds = ({ id, members = [] }: Pick<BriefCandidate, 'id' | 'members'>): string[] => [
  id,
  ...members.map((member) => member.id),
];

/** The alerts of a candidate and its members: stamped with their ids, or without a stamp, by their records. */
export const buildAlertsFilter = (
  candidate: BriefCandidate
): { bool: QueryDslBoolQuery & { should: QueryDslQueryContainer[] } } => {
  const { id, members } = candidate;
  return {
    bool: {
      should: [
        { terms: { [ALERT_ENTITY_ID]: getEntityIds({ id, members }) } },
        {
          bool: {
            filter: [{ bool: { should: buildRecordFilters(candidate), minimum_should_match: 1 } }],
            must_not: [{ exists: { field: ALERT_ENTITY_ID } }],
          },
        },
      ],
      minimum_should_match: 1,
    },
  };
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
                ruleCount: bucket.ruleCount.value,
                otherRuleCount: Math.max(0, bucket.ruleCount.value - bucket.rules.buckets.length),
                rules: bucket.rules.buckets.map(({ key, doc_count: count }, index) => ({
                  index: index + 1,
                  name: truncate(key, { length: MAX_RULE_NAME_LENGTH }),
                  count,
                })),
              },
            ],
          ]
        : []
    )
  );
