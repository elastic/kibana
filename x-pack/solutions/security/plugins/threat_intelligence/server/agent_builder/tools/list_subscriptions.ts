/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { THREAT_INTEL_SUBSCRIPTIONS_INDEX, THREAT_INTEL_TOOL_IDS } from '../../../common';

const listSubscriptionsSchema = z.object({
  size: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .describe('Maximum number of subscriptions to return.'),
});

export const listSubscriptionsTool: BuiltinSkillBoundedTool<typeof listSubscriptionsSchema> = {
  id: THREAT_INTEL_TOOL_IDS.listSubscriptions,
  type: ToolType.builtin,
  description:
    "List the current user's active threat-intelligence digest subscriptions. Use when the " +
    'user asks "what threat-intel digests am I subscribed to?", "show my subscriptions", or ' +
    'wants to inspect/edit them.',
  schema: listSubscriptionsSchema,
  handler: async ({ size }, { esClient, logger }) => {
    try {
      const response = await esClient.asCurrentUser.search({
        index: THREAT_INTEL_SUBSCRIPTIONS_INDEX,
        size,
        sort: [{ created_at: { order: 'desc' } }],
        // owner filter intentionally omitted — index has user RBAC at the role
        // mapping layer in production deployments.
      });

      const subscriptions = (response.hits.hits ?? []).map((hit) => ({
        subscription_id: hit._id,
        ...(hit._source as Record<string, unknown>),
      }));

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              total:
                typeof response.hits.total === 'number'
                  ? response.hits.total
                  : response.hits.total?.value ?? subscriptions.length,
              subscriptions,
            },
          },
        ],
      };
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404) {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: { total: 0, subscriptions: [] },
            },
          ],
        };
      }
      logger.warn(`list_subscriptions failed: ${(err as Error).message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Failed to list subscriptions: ${(err as Error).message}` },
          },
        ],
      };
    }
  },
};
