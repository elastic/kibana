/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import { ToolType } from '@kbn/agent-builder-common/tools';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { z } from '@kbn/zod/v4';
import { DEFAULT_ALERTS_INDEX } from '../../../../../common/constants';
import { FALSE_POSITIVE_THRESHOLD } from './common';

export const getSearchAlertsByRuleTool = () => ({
  id: 'security.fix-false-positive-alerts.search-alerts-by-rule',
  type: ToolType.builtin,
  description:
    'Search security alerts by detection rule ID and determine if the rule is generating false positives. ' +
    'Returns matching alerts and flags the rule as a false positive source if more than 10 alerts are found.',
  schema: z.object({
    ruleId: z
      .string()
      .describe('The detection rule ID (kibana.alert.rule.uuid) to search alerts for'),
    size: z
      .number()
      .min(1)
      .max(100)
      .default(20)
      .describe('Maximum number of alert documents to return (1-100, default 20)'),
  }),
  handler: async (
    { ruleId, size }: { ruleId: string; size: number },
    context: {
      spaceId: string;
      esClient: { asCurrentUser: { search: (q: unknown) => Promise<unknown> } };
    }
  ) => {
    try {
      const alertsIndex = `${DEFAULT_ALERTS_INDEX}-${context.spaceId}`;

      const searchQuery = {
        index: alertsIndex,
        size: Number(size),
        query: {
          bool: {
            filter: [{ term: { 'kibana.alert.rule.uuid': String(ruleId) } }],
          },
        },
        sort: [{ '@timestamp': 'desc' }],
        track_total_hits: true,
        _source: [
          '@timestamp',
          'kibana.alert.rule.name',
          'kibana.alert.rule.uuid',
          'kibana.alert.severity',
          'kibana.alert.risk_score',
          'kibana.alert.workflow_status',
          'kibana.alert.reason',
          'host.name',
          'user.name',
          'source.ip',
          'destination.ip',
          'process.name',
          'message',
        ],
        ignore_unavailable: true,
      };
      console.log(`[search-alerts-by-rule] ES query:`, JSON.stringify(searchQuery, null, 2));

      const searchResult = (await context.esClient.asCurrentUser.search(searchQuery)) as {
        hits: {
          total: number | { value: number };
          hits: Array<{ _id: string; _source: Record<string, unknown> }>;
        };
      };

      const total =
        typeof searchResult.hits.total === 'number'
          ? searchResult.hits.total
          : searchResult.hits.total?.value ?? 0;

      const hits = searchResult.hits.hits.map((hit) => ({
        _id: hit._id,
        ...hit._source,
      }));

      const isFalsePositive = total > FALSE_POSITIVE_THRESHOLD;
      const ruleName =
        hits.length > 0
          ? ((hits[0] as Record<string, unknown>)['kibana.alert.rule.name'] as
              | string
              | undefined) ?? 'Unknown'
          : 'Unknown';

      const assessment = isFalsePositive
        ? `False Positive detected: Rule "${ruleName}" (${ruleId}) has generated ${total} alerts, exceeding the threshold of ${FALSE_POSITIVE_THRESHOLD}. This rule is likely producing false positives and should be tuned.`
        : `Rule "${ruleName}" (${ruleId}) has generated ${total} alert(s), which is within the normal threshold of ${FALSE_POSITIVE_THRESHOLD}. No false positive concern detected.`;

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              assessment,
              isFalsePositive,
              total,
              threshold: FALSE_POSITIVE_THRESHOLD,
              ruleId,
              ruleName,
              alerts: hits,
            },
          },
        ],
      };
    } catch (error) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to search alerts for rule ${ruleId}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          },
        ],
      };
    }
  },
});
