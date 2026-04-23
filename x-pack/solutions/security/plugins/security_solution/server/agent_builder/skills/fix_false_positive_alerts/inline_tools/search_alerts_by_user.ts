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
import { type TermsAggBuckets, RICH_ALERT_SOURCE_FIELDS, toBucketList } from './common';

export const getSearchAlertsByUserTool = () => ({
  id: 'security.fix-false-positive-alerts.search-alerts-by-user',
  type: ToolType.builtin,
  description:
    'Search alerts for a detection rule aggregated by user.name, process.parent.name, and process.name. ' +
    'Returns ranked breakdowns of users, parent processes, and processes by alert count, plus sample alert documents. ' +
    'The parentProcessBreakdown is the most important output — it reveals the root cause of false positives.',
  schema: z.object({
    ruleId: z
      .string()
      .describe('The detection rule ID (kibana.alert.rule.uuid) to search alerts for'),
    userName: z
      .string()
      .optional()
      .describe(
        'Optional: filter to a specific user name. Omit to see all users ranked by alert count.'
      ),
    size: z
      .number()
      .min(1)
      .max(100)
      .default(20)
      .describe('Maximum number of sample alert documents to return (1-100, default 20)'),
  }),
  handler: async (
    { ruleId, userName, size }: { ruleId: string; userName?: string; size: number },
    context: {
      spaceId: string;
      esClient: { asCurrentUser: { search: (q: unknown) => Promise<unknown> } };
    }
  ) => {
    try {
      const alertsIndex = `${DEFAULT_ALERTS_INDEX}-${context.spaceId}`;

      const filters: Array<Record<string, unknown>> = [
        { term: { 'kibana.alert.rule.uuid': String(ruleId) } },
      ];
      if (userName) {
        filters.push({ term: { 'user.name': String(userName) } });
      }

      const searchQuery = {
        index: alertsIndex,
        size: Number(size),
        query: { bool: { filter: filters } },
        sort: [{ '@timestamp': 'desc' as const }],
        track_total_hits: true,
        _source: RICH_ALERT_SOURCE_FIELDS,
        aggs: {
          users: {
            terms: { field: 'user.name', size: 20 },
          },
          parent_processes: {
            terms: { field: 'process.parent.name', size: 20 },
          },
          processes: {
            terms: { field: 'process.name', size: 20 },
          },
        },
        ignore_unavailable: true,
      };
      console.log(`[search-alerts-by-user] ES query:`, JSON.stringify(searchQuery, null, 2));

      const searchResult = (await context.esClient.asCurrentUser.search(searchQuery)) as {
        hits: {
          total: number | { value: number };
          hits: Array<{ _id: string; _source: Record<string, unknown> }>;
        };
        aggregations?: Record<string, TermsAggBuckets>;
      };

      const total =
        typeof searchResult.hits.total === 'number'
          ? searchResult.hits.total
          : searchResult.hits.total?.value ?? 0;

      const hits = searchResult.hits.hits.map((hit) => ({
        _id: hit._id,
        ...hit._source,
      }));

      const userBuckets = toBucketList(searchResult.aggregations?.users);
      const parentProcessBuckets = toBucketList(searchResult.aggregations?.parent_processes);
      const processBuckets = toBucketList(searchResult.aggregations?.processes);

      const topUser = userBuckets[0];
      const topParent = parentProcessBuckets[0];
      let assessment =
        userBuckets.length > 0 && topUser
          ? `User "${topUser.value}" leads with ${topUser.alertCount} of ${total} total alerts. ` +
            `${userBuckets.length} distinct user(s) found.`
          : `No user data found in alerts for rule ${ruleId}.`;
      if (topParent) {
        assessment +=
          ` Top parent process: "${topParent.value}" (${topParent.alertCount} alerts).` +
          ` Parent processes are often the root cause of false positives — consider excluding by parent process rather than user.`;
      }

      console.log(`[search-alerts-by-user] ${assessment}`);

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              assessment,
              total,
              ruleId,
              userBreakdown: userBuckets,
              parentProcessBreakdown: parentProcessBuckets,
              processBreakdown: processBuckets,
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
              message: `Failed to search alerts by user for rule ${ruleId}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          },
        ],
      };
    }
  },
});
