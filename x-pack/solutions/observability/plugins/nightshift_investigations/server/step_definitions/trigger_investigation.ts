/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import {
  MAX_ARRAY_LENGTH,
  MAX_ID_LENGTH,
  MAX_TEXT_LENGTH,
  MAX_TITLE_LENGTH,
} from '@kbn/significant-events-schema';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { serverUnavailable } from '@hapi/boom';
import type { KibanaRequest } from '@kbn/core/server';
import {
  DEFAULT_MANUAL_INVESTIGATION_SUBJECT_ID,
  INVESTIGATION_SUBJECT_TYPES,
  INVESTIGATION_TRIGGER_TYPES,
  investigationNotificationDestinationsSchema,
  MAX_KEYWORD_LENGTH,
  toSlackThreadSubjectId,
} from '../../common';
import type {
  GetAlertsClient,
  GetAutomationsSoClient,
  GetEpisodeLookup,
  GetInvestigationsClient,
} from '../routes/types';
import { fetchInvestigationAlertSnapshots } from '../lib/alert_snapshot';
import { NIGHTSHIFT_AUTOMATION_SO_TYPE } from '../saved_objects/automation_saved_object';
import type { NightshiftAutomationAttributes } from '../lib/automations/types';
import { consumeAutomationBudget } from '../lib/automations/automation_budget';

const inputSchema = lazySchema(() =>
  z.object({
    automation_id: z
      .string()
      .min(1)
      .max(512)
      .optional()
      .describe(
        'Owning automation ID. Enforces its current daily dispatch limit before starting an investigation.'
      ),
    subject_type: z
      .enum(INVESTIGATION_SUBJECT_TYPES)
      .describe(
        'The type of entity being investigated. Use "manual" when the prompt is the whole subject, and "slack_thread" when it is a Slack thread, which slack_thread then names.'
      ),
    subject_id: z
      .string()
      .min(1)
      .max(MAX_ID_LENGTH)
      .optional()
      .describe(
        'The subject ID; optional for a manual question, and not accepted for a Slack thread, whose ID comes from slack_thread'
      ),
    title: z
      .string()
      .min(1)
      .max(MAX_TITLE_LENGTH)
      .optional()
      .describe(
        'Accepted for compatibility; not used as the investigation title, which Agent Builder generates from the first round'
      ),
    trigger_type: z
      .enum(INVESTIGATION_TRIGGER_TYPES)
      .optional()
      .describe('What initiated this investigation. Defaults to "automatic".'),
    summary: z
      .string()
      .max(MAX_TEXT_LENGTH)
      .optional()
      .describe('Short description of the subject, returned on reads as subject.summary'),
    message: z
      .string()
      .min(1)
      .max(MAX_TEXT_LENGTH)
      .optional()
      .describe('Caller-supplied prompt for the investigation agent'),
    source_ids: z
      .array(z.string().max(MAX_ID_LENGTH))
      .max(MAX_ARRAY_LENGTH)
      .optional()
      .describe('Nightshift source ids to scope the investigation'),
    scope_query: z
      .string()
      .max(MAX_TEXT_LENGTH)
      .optional()
      .describe('Query scope guidance for a manual investigation; not an enforced access filter'),
    timeout_seconds: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe('Upper bound for this investigation workflow run in seconds'),
    context: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(
        'Additional context to pass to the investigation workflow. When subject_type is "alert" and no "alerts" array is given, the alert is looked up by subject_id (classic or universal). Otherwise this must carry an "alerts" array of alert snapshots.'
      ),
    notificationDestinations: investigationNotificationDestinationsSchema
      .optional()
      .describe(
        'Destinations that receive the concluded investigation. Delivery results are recorded on the investigation.'
      ),
    // Bounded like the Slack thread route, so the thread's subject id stays within a subject id.
    slack_thread: z
      .object({
        workspace: z.string().min(1).max(128),
        channel: z.string().min(1).max(256),
        thread_ts: z.string().min(1).max(64),
        external_conversation_id: z
          .string()
          .max(MAX_KEYWORD_LENGTH)
          .optional()
          .describe(
            "The Relay's key for the thread. When empty, the same key is built from the thread's ids."
          ),
      })
      .optional()
      .describe(
        'The Slack thread the investigation is about. A reply in that thread continues the investigation.'
      ),
  })
);

const resolveAlerts = async ({
  subjectId,
  request,
  spaceId,
  getAlertsClient,
  getEpisodeLookup,
}: {
  subjectId: string;
  request: KibanaRequest;
  spaceId: string;
  getAlertsClient: GetAlertsClient;
  getEpisodeLookup: GetEpisodeLookup;
}) => {
  const alertsClient = await getAlertsClient(request);
  if (!alertsClient) {
    throw serverUnavailable('Alert lookup is unavailable');
  }
  return fetchInvestigationAlertSnapshots({
    alertsClient,
    alertIds: [subjectId],
    ...getEpisodeLookup(request, spaceId),
  });
};

const toSubjectId = ({
  subject_type: subjectType,
  subject_id: subjectId,
  slack_thread: slackThread,
  message,
}: z.infer<typeof inputSchema>): string => {
  if (subjectType === 'slack_thread') {
    if (!slackThread) throw new Error('Slack thread investigations require slack_thread.');
    if (subjectId) {
      throw new Error('Slack thread investigations take their subject ID from slack_thread.');
    }
    if (!message?.trim()) throw new Error('Slack thread investigations require a message.');
    return toSlackThreadSubjectId(slackThread);
  }
  if (subjectType === 'manual') {
    if (!message?.trim()) throw new Error('Manual investigations require a message.');
    return subjectId ?? DEFAULT_MANUAL_INVESTIGATION_SUBJECT_ID;
  }
  if (!subjectId) {
    throw new Error('Alert and significant event investigations require a subject ID.');
  }
  return subjectId;
};

export const triggerInvestigationStepDefinition = (
  getInvestigationsClient: GetInvestigationsClient,
  getAutomationsSoClient: GetAutomationsSoClient,
  getAlertsClient: GetAlertsClient,
  getEpisodeLookup: GetEpisodeLookup
) =>
  createServerStepDefinition({
    id: 'nightshift.triggerInvestigation',
    label: 'Trigger Nightshift Investigation',
    category: StepCategory.Ai,
    description:
      'Start an investigation for a given subject (significant event, alert, or other entity). When the subject, or any alert in context.alerts, is already part of an open investigation, that investigation continues instead. Returns investigation_id for tracking, or skip_reason when the automation daily limit is reached.',
    inputSchema,
    outputSchema: z.object({
      investigation_id: z
        .string()
        .optional()
        .describe('The investigation (Agent Builder conversation) the start created or continued'),
      skip_reason: z
        .literal('daily_limit')
        .optional()
        .describe('Why the investigation was not dispatched'),
      daily_limit: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('The daily limit that denied this dispatch'),
    }),
    handler: async (context) => {
      const request = context.contextManager.getFakeRequest();
      // getFakeRequest() does not carry space info, so the space ID must be extracted from the
      // workflow context explicitly. See https://github.com/elastic/kibana/issues/284786.
      const { workflow } = context.contextManager.getContext();
      const spaceId = workflow.spaceId;
      const input = inputSchema.parse(context.input);
      const subjectId = toSubjectId(input);
      if (input.automation_id) {
        const soClient = getAutomationsSoClient(request, spaceId);
        const automation = await soClient.get<NightshiftAutomationAttributes>(
          NIGHTSHIFT_AUTOMATION_SO_TYPE,
          input.automation_id
        );
        if (automation.attributes.workflowId !== workflow.id) {
          throw new Error('The automation does not belong to this workflow.');
        }
        const dailyLimit = automation.attributes.runtime.dailyDispatchLimit;
        const allowed = await consumeAutomationBudget(soClient, input.automation_id, dailyLimit);
        if (!allowed) {
          return { output: { skip_reason: 'daily_limit' as const, daily_limit: dailyLimit } };
        }
      }
      const client = getInvestigationsClient(request, spaceId);
      const alerts =
        input.subject_type === 'alert' && !input.context?.alerts
          ? await resolveAlerts({
              subjectId,
              request,
              spaceId,
              getAlertsClient,
              getEpisodeLookup,
            })
          : undefined;
      const result = await client.start({
        subject: {
          type: input.subject_type,
          id: subjectId,
          summary: input.summary,
        },
        title: input.title,
        trigger_type: input.trigger_type ?? 'automatic',
        message: input.message,
        source_ids: input.source_ids,
        context: alerts
          ? { alerts }
          : input.scope_query && input.subject_type === 'manual'
          ? { ...input.context, scope_query: input.scope_query }
          : input.context,
        timeout_seconds: input.timeout_seconds,
        notificationDestinations: input.notificationDestinations,
        slack_thread: input.slack_thread,
      });
      return { output: result };
    },
  });
