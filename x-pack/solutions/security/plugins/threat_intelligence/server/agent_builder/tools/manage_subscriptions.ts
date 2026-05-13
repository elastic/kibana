/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import {
  GLOBAL_SPACE_ID,
  SEVERITY_LEVELS,
  SUBSCRIPTION_TEMPLATE_IDS,
  THREAT_INTEL_SUBSCRIPTIONS_INDEX,
  THREAT_INTEL_TOOL_IDS,
  getSubscriptionTemplate,
  type SeverityLevel,
} from '../../../common';

/**
 * Shared input shape for subscription persistence. Used by both the
 * `manage_subscriptions` tool (when `action='create'` with `confirm=true`)
 * and the interactive form HTTP route — keeping a single helper means the
 * two paths can't drift.
 */
export interface PersistSubscriptionInput {
  tags: string[];
  severity_threshold: SeverityLevel;
  schedule_rrule: string;
  delivery: { type: 'email' | 'slack'; target: string; connector_id?: string };
  template_id?: string;
  owner?: string;
  /**
   * Logical per-space isolation tag. Routes resolve `request.getSpaceId()`
   * and pass it here; agent-builder tool invocations leave it undefined,
   * in which case the row defaults to `'default'`.
   */
  space_id?: string;
}

export interface PersistSubscriptionResult {
  subscription_id: string;
  human_summary: string;
}

const humanizeSchedule = (
  rrule: string,
  tags: string[],
  severity: string,
  target: string
): string => {
  const tagList = tags.map((t) => `\`${t}\``).join(', ');
  const friendly = /WEEKLY/.test(rrule) ? 'Weekly' : /DAILY/.test(rrule) ? 'Daily' : rrule;
  return `${friendly} digest of ${severity}+ severity reports tagged ${tagList} delivered to \`${target}\`.`;
};

export const persistSubscription = async (
  esClient: ElasticsearchClient,
  input: PersistSubscriptionInput
): Promise<PersistSubscriptionResult> => {
  const humanSummary = humanizeSchedule(
    input.schedule_rrule,
    input.tags,
    input.severity_threshold,
    input.delivery.target
  );
  const now = new Date().toISOString();
  const indexResponse = await esClient.index({
    index: THREAT_INTEL_SUBSCRIPTIONS_INDEX,
    document: {
      owner: input.owner ?? 'self',
      tags: input.tags,
      severity_threshold: input.severity_threshold,
      schedule_rrule: input.schedule_rrule,
      delivery: input.delivery,
      human_summary: humanSummary,
      template_id: input.template_id,
      space_id: input.space_id ?? 'default',
      created_at: now,
      updated_at: now,
    },
  });
  return { subscription_id: indexResponse._id, human_summary: humanSummary };
};

const manageSubscriptionsSchema = z
  .object({
    action: z
      .enum(['create', 'list', 'delete'])
      .describe(
        '`create` — propose a new subscription (or persist directly when `confirm=true`). ' +
          "`list` — return the current user's active subscriptions. " +
          '`delete` — remove an existing subscription by id.'
      ),
    // ---------- shared / list-only ----------
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
    // ---------- create-only ----------
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
          'matching `delivery.type` (.email or .slack); ambiguous environments should pass ' +
          'this explicitly. Discoverable via the agent-builder `get_connectors` tool.'
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
    'Manage scheduled threat-intelligence digest subscriptions (replaces the legacy ' +
      '`create_subscription` + `list_subscriptions` pair). Default `create` flow returns an ' +
      "editable confirmation card that posts directly to the plugin's internal route on Submit."
  );

interface ResolvedParams {
  tags: string[];
  severity_threshold: SeverityLevel;
  schedule_rrule: string;
  delivery: { type: 'email' | 'slack'; target: string; connector_id?: string };
  template_id?: string;
}

const resolveCreateParams = (
  input: z.infer<typeof manageSubscriptionsSchema>
): { ok: true; resolved: ResolvedParams } | { ok: false; reason: string } => {
  if (!input.delivery_target) {
    return {
      ok: false,
      reason: '`delivery_target` is required for `action="create"`.',
    };
  }
  const template = input.template_id ? getSubscriptionTemplate(input.template_id) : undefined;

  const tags = input.tags ?? template?.tags;
  if (!tags || tags.length === 0) {
    return {
      ok: false,
      reason:
        'No `tags` were provided and no `template_id` was set. Either pass tags directly or ' +
        `pick a template from: ${SUBSCRIPTION_TEMPLATE_IDS.join(', ')}.`,
    };
  }

  const deliveryType = input.delivery_type ?? template?.delivery_type_default ?? 'email';

  return {
    ok: true,
    resolved: {
      tags,
      severity_threshold: input.severity_threshold ?? template?.severity_threshold ?? 'medium',
      schedule_rrule:
        input.schedule_rrule ?? template?.schedule_rrule ?? 'FREQ=WEEKLY;BYDAY=MO;BYHOUR=9',
      delivery: {
        type: deliveryType,
        target: input.delivery_target,
        ...(input.delivery_connector_id
          ? { connector_id: input.delivery_connector_id }
          : template?.delivery_connector_id_default
          ? { connector_id: template.delivery_connector_id_default }
          : {}),
      },
      template_id: template?.id,
    },
  };
};

export const manageSubscriptionsTool: BuiltinSkillBoundedTool<typeof manageSubscriptionsSchema> = {
  id: THREAT_INTEL_TOOL_IDS.manageSubscriptions,
  type: ToolType.builtin,
  description:
    'Manage scheduled threat-intelligence digest subscriptions. Three actions: `create` ' +
    '(propose or persist), `list` (inspect), `delete` (remove by id). For `create`, pass ' +
    '`template_id` to bootstrap from a pre-staged preset; with `confirm=false` the tool ' +
    'returns parameters for an editable confirmation card that submits directly to the ' +
    "plugin's internal route.",
  schema: manageSubscriptionsSchema,
  handler: async (input, { esClient, logger, spaceId }) => {
    const client = esClient.asCurrentUser;

    if (input.action === 'list') {
      const size = input.size ?? 20;
      try {
        const response = await client.search({
          index: THREAT_INTEL_SUBSCRIPTIONS_INDEX,
          size,
          sort: [{ created_at: { order: 'desc' } }],
          query: {
            bool: {
              filter: [{ terms: { space_id: [spaceId, GLOBAL_SPACE_ID] } }],
            },
          },
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
                action: 'list',
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
                data: { action: 'list', total: 0, subscriptions: [] },
              },
            ],
          };
        }
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
        await client.delete({
          index: THREAT_INTEL_SUBSCRIPTIONS_INDEX,
          id: input.subscription_id,
        });
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                action: 'delete',
                status: 'deleted',
                subscription_id: input.subscription_id,
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
                data: {
                  action: 'delete',
                  status: 'not_found',
                  subscription_id: input.subscription_id,
                },
              },
            ],
          };
        }
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
    const resolution = resolveCreateParams(input);
    if (!resolution.ok) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: resolution.reason },
          },
        ],
      };
    }
    const { resolved } = resolution;
    const humanSummary = humanizeSchedule(
      resolved.schedule_rrule,
      resolved.tags,
      resolved.severity_threshold,
      resolved.delivery.target
    );

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
                human_summary: humanSummary,
                template_id: resolved.template_id,
              },
              next_step:
                'Render a `threat-intel-subscription-confirmation` attachment with these ' +
                'parameters. The user can edit fields inline; Submit posts directly to ' +
                '/internal/threat_intelligence/subscriptions/submit so this tool does NOT ' +
                'need to be invoked again with confirm=true unless the caller is acting ' +
                'non-interactively.',
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
