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
  SEVERITY_LEVELS,
  SUBSCRIPTION_TEMPLATE_IDS,
  THREAT_INTEL_SUBSCRIPTIONS_INDEX,
  THREAT_INTEL_TOOL_IDS,
  getSubscriptionTemplate,
  type SeverityLevel,
} from '../../../common';

/**
 * Shared input shape for subscription persistence. Used by both the
 * `create_subscription` tool (when `confirm=true`) and the interactive form
 * HTTP route — keeping a single helper means the two paths can't drift.
 */
export interface PersistSubscriptionInput {
  tags: string[];
  severity_threshold: SeverityLevel;
  schedule_rrule: string;
  delivery: { type: 'email' | 'slack'; target: string };
  template_id?: string;
  owner?: string;
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
  // Naive pretty-print — full RRULE expansion is out of scope for the v1 confirmation card.
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
      created_at: now,
      updated_at: now,
    },
  });
  return { subscription_id: indexResponse._id, human_summary: humanSummary };
};

const createSubscriptionSchema = z
  .object({
    template_id: z
      .enum(SUBSCRIPTION_TEMPLATE_IDS as [string, ...string[]])
      .optional()
      .describe(
        'Optional pre-staged template id (e.g. "daily-threat-debrief", "weekly-ciso-digest", ' +
          '"ransomware-watch"). When set, missing fields default to the template values; ' +
          'explicit fields still win.'
      ),
    tags: z
      .array(z.string().min(1))
      .optional()
      .describe(
        'Topic tags to filter the digest (e.g. ["volt-typhoon", "lateral-movement"]). ' +
          'Required unless `template_id` is set.'
      ),
    severity_threshold: z
      .enum(SEVERITY_LEVELS)
      .optional()
      .describe('Minimum severity to include in the digest.'),
    schedule_rrule: z.string().optional().describe('iCalendar RRULE string.'),
    delivery_type: z.enum(['email', 'slack']).optional().describe('Delivery channel.'),
    delivery_target: z
      .string()
      .min(1)
      .describe('Email address or Slack channel id (e.g. "ciso-digest@corp.com" or "#security").'),
    confirm: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        'Set to true to persist directly. When false, the tool returns a proposed parameter ' +
          'set for the user to edit in the interactive subscription-confirmation card. The ' +
          'card submits directly to /internal/threat_intelligence/subscriptions/submit, so a ' +
          'second invocation of this tool with confirm=true is only required when the agent ' +
          'is acting non-interactively (e.g. from a workflow).'
      ),
  })
  .describe(
    'Create a scheduled threat-intelligence digest subscription. Default flow: set ' +
      'confirm=false to surface an editable confirmation card that posts directly to the ' +
      "plugin's internal route on Submit. Pass `template_id` to bootstrap the form with " +
      'sensible defaults (e.g. the Daily Threat Debrief preset).'
  );

interface ResolvedParams {
  tags: string[];
  severity_threshold: SeverityLevel;
  schedule_rrule: string;
  delivery: { type: 'email' | 'slack'; target: string };
  template_id?: string;
}

const resolveParams = (
  input: z.infer<typeof createSubscriptionSchema>
): { ok: true; resolved: ResolvedParams } | { ok: false; reason: string } => {
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
      delivery: { type: deliveryType, target: input.delivery_target },
      template_id: template?.id,
    },
  };
};

export const createSubscriptionTool: BuiltinSkillBoundedTool<typeof createSubscriptionSchema> = {
  id: THREAT_INTEL_TOOL_IDS.createSubscription,
  type: ToolType.builtin,
  description:
    'Create a scheduled digest subscription delivering threat-intelligence reports matching ' +
    "the user's tags + severity to email or Slack. Pass `template_id` to bootstrap with a " +
    'pre-staged preset (e.g. "daily-threat-debrief"). With `confirm=false`, the tool returns ' +
    'parameters for an editable confirmation card; the card submits directly to the plugin ' +
    'route, so a second confirm=true call is only needed for non-interactive callers.',
  schema: createSubscriptionSchema,
  handler: async (input, { esClient, logger }) => {
    const resolution = resolveParams(input);
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
      const result = await persistSubscription(esClient.asCurrentUser, {
        tags: resolved.tags,
        severity_threshold: resolved.severity_threshold,
        schedule_rrule: resolved.schedule_rrule,
        delivery: resolved.delivery,
        template_id: resolved.template_id,
      });
      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              status: 'created',
              subscription_id: result.subscription_id,
              human_summary: result.human_summary,
              template_id: resolved.template_id,
            },
          },
        ],
      };
    } catch (err) {
      logger.warn(`create_subscription failed: ${(err as Error).message}`);
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
