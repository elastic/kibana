/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { GetInvestigationsClient } from '../routes/types';

const MAX_ALERT_FIELD_LENGTH = 500;

const inputSchema = lazySchema(() =>
  z.object({
    alert_uuid: z.string().min(1).max(MAX_ALERT_FIELD_LENGTH).describe('The recovered alert UUID'),
    alert_id: z.string().min(1).max(MAX_ALERT_FIELD_LENGTH).describe('The alert instance ID'),
    alert_start: z
      .string()
      .max(100)
      .nullable()
      .optional()
      .describe('When the alert first became active'),
    recovered_at: z
      .string()
      .max(100)
      .optional()
      .describe('When the recovery event was dispatched to workflows'),
    rule_id: z.string().min(1).max(MAX_ALERT_FIELD_LENGTH),
    rule_name: z.string().min(1).max(MAX_ALERT_FIELD_LENGTH),
    rule_type_id: z.string().min(1).max(MAX_ALERT_FIELD_LENGTH),
    rule_tags: z.array(z.string().max(MAX_ALERT_FIELD_LENGTH)).max(50).optional(),
  })
);

export const followUpRecoveredAlertStepDefinition = (
  getInvestigationsClient: GetInvestigationsClient
) =>
  createServerStepDefinition({
    id: 'nightshift.followUpRecoveredAlert',
    label: 'Follow Up on a Recovered Alert',
    category: StepCategory.Ai,
    description:
      'When an open investigation holds the recovered alert, runs a round on it that checks whether the recovery confirms or refutes its root cause. Never starts an investigation. Returns investigation_id and the execution_id of the round, or skip_reason when no open investigation holds the alert.',
    inputSchema,
    outputSchema: z.object({
      investigation_id: z
        .string()
        .optional()
        .describe('The investigation the recovery round was requested on'),
      execution_id: z
        .string()
        .optional()
        .describe(
          'The investigation workflow execution of the recovery round, which records whether it ran'
        ),
      skip_reason: z
        .literal('no_open_investigation')
        .optional()
        .describe('Why no recovery round was queued'),
    }),
    handler: async (context) => {
      const request = context.contextManager.getFakeRequest();
      // getFakeRequest() does not carry space info, so the space ID must be extracted from the
      // workflow context explicitly. See https://github.com/elastic/kibana/issues/284786.
      const { workflow } = context.contextManager.getContext();
      const input = inputSchema.parse(context.input);
      const result = await getInvestigationsClient(
        request,
        workflow.spaceId
      ).followUpRecoveredAlert({
        alertUuid: input.alert_uuid,
        alertId: input.alert_id,
        alertStart: input.alert_start,
        recoveredAt: input.recovered_at,
        ruleId: input.rule_id,
        ruleName: input.rule_name,
        ruleTypeId: input.rule_type_id,
        ruleTags: input.rule_tags,
      });
      return { output: result ?? { skip_reason: 'no_open_investigation' as const } };
    },
  });
