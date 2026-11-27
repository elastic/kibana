/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { lazySchema, z } from '@kbn/zod/v4';
import { MAX_ID_LENGTH, MAX_TEXT_LENGTH, MAX_TITLE_LENGTH } from '@kbn/significant-events-schema';
import type { BaseStepDefinition } from '@kbn/workflows';
import { StepCategory } from '@kbn/workflows';
import { MAX_AUTOMATION_INSTRUCTIONS_LENGTH } from '../../automation_limits';
import { MAX_KEYWORD_LENGTH } from '../..';
import { investigationNotificationDestinationsSchema } from '../../schemas';
import { INVESTIGATION_SUBJECT_TYPES, INVESTIGATION_TRIGGER_TYPES } from '../triggers';

export const TriggerInvestigationStepId = 'nightshift.triggerInvestigation' as const;

export const triggerInvestigationStepInputSchema = lazySchema(() =>
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
    instructions: z
      .string()
      .max(MAX_AUTOMATION_INSTRUCTIONS_LENGTH)
      .optional()
      .describe(
        'Additional operator guidance for this investigation round; empty means no additional guidance'
      ),
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

export const triggerInvestigationStepOutputSchema = lazySchema(() =>
  z.object({
    execution_id: z.string().optional(),
    investigation_id: z
      .string()
      .optional()
      .describe('The investigation (Agent Builder conversation) the start created or continued'),
    skip_reason: z
      .enum(['daily_limit', 'investigation_limit'])
      .optional()
      .describe('Why the investigation was not dispatched'),
    daily_limit: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe('The daily limit that denied this dispatch'),
  })
);

export const triggerInvestigationStepCommonDefinition: BaseStepDefinition<
  typeof triggerInvestigationStepInputSchema,
  typeof triggerInvestigationStepOutputSchema
> = {
  id: TriggerInvestigationStepId,
  label: i18n.translate('xpack.nightshiftInvestigations.steps.triggerInvestigation.label', {
    defaultMessage: 'Trigger Nightshift Investigation',
  }),
  category: StepCategory.Ai,
  description: i18n.translate(
    'xpack.nightshiftInvestigations.steps.triggerInvestigation.description',
    {
      defaultMessage:
        'Start an investigation for a given subject (significant event, alert, or other entity). When the subject, or any alert in context.alerts, is already part of an open investigation, that investigation continues instead. Returns investigation_id for tracking, or skip_reason when the automation daily limit or the deployment-wide investigation limit is reached.',
    }
  ),
  inputSchema: triggerInvestigationStepInputSchema,
  outputSchema: triggerInvestigationStepOutputSchema,
};
