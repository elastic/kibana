/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { BaseStepDefinition } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';
import { MAX_WORKFLOW_MESSAGE_LENGTH } from '../common/constants';

export const KillProcessStepId = 'security.killProcess' as const;

const MAX_ENDPOINT_ID_LENGTH = 256;
const MAX_ENDPOINT_IDS = 250;
const MAX_COMMENT_LENGTH = 30000;
const MAX_ENTITY_ID_LENGTH = 256;

/**
 * Process selector: exactly one of pid or entity_id is required.
 * kill_descendants is valid for both Elastic Defend variants (not sentinel_one).
 */
const killProcessParametersSchema = z.union([
  z.object({
    pid: z.number().int().min(1).describe('Process ID (PID) of the process to kill.'),
  }),
  z.object({
    entity_id: z
      .string()
      .min(1)
      .max(MAX_ENTITY_ID_LENGTH)
      .describe('Elastic Defend entity_id of the process to kill.'),
  }),
]);

export const killProcessInputSchema = z.object({
  endpoint_ids: z
    .array(z.string().min(1).max(MAX_ENDPOINT_ID_LENGTH))
    .min(1)
    .max(MAX_ENDPOINT_IDS)
    .describe('Elastic Defend agent IDs (agent.id) of the endpoints.'),
  parameters: killProcessParametersSchema.describe(
    'Process selector: provide either pid or entity_id.'
  ),
  comment: z.string().max(MAX_COMMENT_LENGTH).optional().describe('Optional comment.'),
});

export const killProcessOutputSchema = z.object({
  action_id: z.string().describe('The ID of the dispatched kill-process action.'),
  status: z
    .enum(['failed', 'pending', 'successful', 'canceled'])
    .describe('Status of the action at dispatch time (usually pending).'),
  was_successful: z.boolean().describe('Whether the action was already successful at dispatch.'),
  message: z.string().max(MAX_WORKFLOW_MESSAGE_LENGTH).optional(),
});

export const killProcessStepCommonDefinition: BaseStepDefinition<
  typeof killProcessInputSchema,
  typeof killProcessOutputSchema
> = {
  id: KillProcessStepId,
  label: i18n.translate('xpack.securitySolution.workflows.steps.killProcess.label', {
    defaultMessage: 'Kill Process',
  }),
  description: i18n.translate('xpack.securitySolution.workflows.steps.killProcess.description', {
    defaultMessage:
      'Terminates a process on an endpoint via the Elastic Defend response action. Identify the process by PID or entity_id.',
  }),
  category: StepCategory.KibanaSecurity,
  inputSchema: killProcessInputSchema,
  outputSchema: killProcessOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.killProcess.documentation.details',
      {
        defaultMessage:
          'Dispatches an Elastic Defend kill-process response action. The process is identified by PID or entity_id taken from endpoint telemetry. The action is queued immediately; status is typically `pending` until the endpoint agent checks in. Requires the `canKillProcess` endpoint privilege.',
      }
    ),
    examples: [
      `## Kill a process by PID
\`\`\`yaml
- name: kill_process
  type: security.killProcess
  with:
    endpoint_ids:
      - "{{ steps.resolve_agent.output.agent_id }}"
    parameters:
      pid: "{{ steps.forensics.output.malicious_pid }}"
    comment: "Killed malicious process identified in forensic analysis."
\`\`\``,
      `## Kill a process by entity_id
\`\`\`yaml
- name: kill_process
  type: security.killProcess
  with:
    endpoint_ids:
      - "{{ steps.resolve_agent.output.agent_id }}"
    parameters:
      entity_id: "{{ steps.forensics.output.process_entity_id }}"
    comment: "Terminated process and descendants."
\`\`\``,
    ],
  },
};
