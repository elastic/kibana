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
import {
  DELETE_SUBSCRIPTION_API_PATH,
  LIST_SUBSCRIPTIONS_API_PATH,
  SEVERITY_LEVELS,
  SUBMIT_SUBSCRIPTION_API_PATH,
  SUBSCRIPTION_TEMPLATE_IDS,
  THREAT_INTEL_TOOL_IDS,
} from '../../../common';
import {
  deleteSubscription,
  listSubscriptions,
  persistSubscription,
  resolveSubscriptionParams,
} from '../../services';

/**
 * Re-export the subscription-persistence types from the shared service so
 * existing imports (e.g. internal helpers that posted to the legacy
 * `submit_subscription` route) keep working.
 */
export type { PersistSubscriptionInput, PersistSubscriptionResult } from '../../services';
export { persistSubscription } from '../../services';

/**
 * Thin Agent Builder tool wrapper for the `manage_subscriptions` domain
 * action (create / list / delete).
 *
 * Canonical execution surface is the trio of internal HTTP routes:
 *   - POST `SUBMIT_SUBSCRIPTION_API_PATH` (action: create + confirm)
 *   - POST `LIST_SUBSCRIPTIONS_API_PATH`  (action: list)
 *   - POST `DELETE_SUBSCRIPTION_API_PATH` (action: delete)
 *
 * The `confirm=false` create flow returns the resolved parameters for the
 * editable confirmation card; the card submits directly to the submit
 * route so a follow-up `confirm=true` call is only needed for
 * non-interactive callers.
 */
const manageSubscriptionsSchema = z
  .object({
    action: z
      .enum(['create', 'list', 'delete'])
      .describe(
        '`create` — propose a new subscription (or persist directly when `confirm=true`). ' +
          "`list` — return the current user's active subscriptions. " +
          '`delete` — remove an existing subscription by id.'
      ),
    size: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe('For `list`: maximum number of subscriptions to return (default 20).'),
    subscription_id: z
      .string()
      .min(1)
      .optional()
      .describe(
        'For `delete`: the subscription id to remove (returned by a prior `list`/`create`).'
      ),
    template_id: z
      .enum(SUBSCRIPTION_TEMPLATE_IDS as [string, ...string[]])
      .optional()
      .describe(
        'For `create`: optional pre-staged template id (e.g. "daily-threat-debrief", ' +
          '"weekly-ciso-digest", "ransomware-watch"). When set, missing fields default to ' +
          'the template values; explicit fields still win.'
      ),
    tags: z
      .array(z.string().min(1))
      .optional()
      .describe(
        'For `create`: topic tags to filter the digest. Required unless `template_id` is set.'
      ),
    severity_threshold: z
      .enum(SEVERITY_LEVELS)
      .optional()
      .describe('For `create`: minimum severity to include in the digest.'),
    schedule_rrule: z.string().optional().describe('For `create`: iCalendar RRULE string.'),
    delivery_type: z
      .enum(['email', 'slack'])
      .optional()
      .describe('For `create`: delivery channel.'),
    delivery_target: z
      .string()
      .min(1)
      .optional()
      .describe(
        'For `create`: email address or Slack channel id ' +
          '(e.g. "ciso-digest@corp.com" or "#security"). Required when `action="create"`.'
      ),
    delivery_connector_id: z
      .string()
      .min(1)
      .optional()
      .describe(
        'For `create`: optional configured Kibana actions connector id used to dispatch ' +
          'the digest. When omitted the digest workflow falls back to the first connector ' +
          'matching `delivery.type` (.email or .slack).'
      ),
    confirm: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        'For `create`: set true to persist directly; false (default) returns a proposed ' +
          'parameter set for the interactive subscription-confirmation card.'
      ),
  })
  .describe(
    'Manage scheduled threat-intelligence digest subscriptions. Default `create` flow returns ' +
      "an editable confirmation card that posts directly to the plugin's internal route on Submit."
  );

export const manageSubscriptionsTool: BuiltinSkillBoundedTool<typeof manageSubscriptionsSchema> = {
  id: THREAT_INTEL_TOOL_IDS.manageSubscriptions,
  type: ToolType.builtin,
  description:
    `Portability wrapper around the subscription routes ` +
    `(${SUBMIT_SUBSCRIPTION_API_PATH}, ${LIST_SUBSCRIPTIONS_API_PATH}, ${DELETE_SUBSCRIPTION_API_PATH}). ` +
    'Three actions: `create` (propose or persist), `list` (inspect), `delete` (remove by id). ' +
    'For `create` with `confirm=false`, returns parameters for an editable confirmation card ' +
    "that submits directly to the plugin's internal route. Inside Kibana, prefer calling the " +
    'routes directly via `execute_workflow_step` + `kibana-request`.',
  schema: manageSubscriptionsSchema,
  handler: async (input, { esClient, logger, spaceId }) => {
    const client = esClient.asCurrentUser;

    if (input.action === 'list') {
      try {
        const data = await listSubscriptions(client, logger, spaceId, input.size ?? 20);
        return { results: [{ type: ToolResultType.other, data: { action: 'list', ...data } }] };
      } catch (err) {
        logger.warn(`manage_subscriptions list failed: ${(err as Error).message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: `Failed to list subscriptions: ${(err as Error).message}` },
            },
          ],
        };
      }
    }

    if (input.action === 'delete') {
      if (!input.subscription_id) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: '`subscription_id` is required for `action="delete"`.' },
            },
          ],
        };
      }
      try {
        const data = await deleteSubscription(client, input.subscription_id);
        return { results: [{ type: ToolResultType.other, data: { action: 'delete', ...data } }] };
      } catch (err) {
        logger.warn(`manage_subscriptions delete failed: ${(err as Error).message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: `Failed to delete subscription: ${(err as Error).message}` },
            },
          ],
        };
      }
    }

    // action === 'create'
    const resolution = resolveSubscriptionParams({
      tags: input.tags,
      severity_threshold: input.severity_threshold,
      schedule_rrule: input.schedule_rrule,
      delivery_type: input.delivery_type,
      delivery_target: input.delivery_target,
      delivery_connector_id: input.delivery_connector_id,
      template_id: input.template_id,
    });
    if (!resolution.ok) {
      return {
        results: [{ type: ToolResultType.error, data: { message: resolution.reason } }],
      };
    }
    const { resolved } = resolution;

    if (!input.confirm) {
      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              action: 'create',
              status: 'pending_confirmation',
              proposed: {
                tags: resolved.tags,
                severity_threshold: resolved.severity_threshold,
                schedule_rrule: resolved.schedule_rrule,
                delivery: resolved.delivery,
                human_summary: resolved.human_summary,
                template_id: resolved.template_id,
              },
              next_step:
                'Render a `threat-intel-subscription-confirmation` attachment with these ' +
                `parameters. The user can edit fields inline; Submit posts directly to ` +
                `${SUBMIT_SUBSCRIPTION_API_PATH} so this tool does NOT need to be invoked ` +
                `again with confirm=true unless the caller is acting non-interactively.`,
            },
          },
        ],
      };
    }

    try {
      const result = await persistSubscription(client, {
        tags: resolved.tags,
        severity_threshold: resolved.severity_threshold,
        schedule_rrule: resolved.schedule_rrule,
        delivery: resolved.delivery,
        template_id: resolved.template_id,
        space_id: spaceId,
      });
      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              action: 'create',
              status: 'created',
              subscription_id: result.subscription_id,
              human_summary: result.human_summary,
              template_id: resolved.template_id,
            },
          },
        ],
      };
    } catch (err) {
      logger.warn(`manage_subscriptions create failed: ${(err as Error).message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Failed to create subscription: ${(err as Error).message}` },
          },
        ],
      };
    }
  },
};
