/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StepCategory } from '@kbn/workflows';
import type { BaseStepDefinition } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';

export const GetRunningProcessesStepId = 'security.getRunningProcesses' as const;

export const getRunningProcessesInputSchema = lazySchema(() =>
  z.object({
    endpoint_ids: z.array(z.string().min(1)).min(1).max(250),
    comment: z.string().max(30000).optional(),
    alert_ids: z.array(z.string()).max(50).optional(),
    case_ids: z.array(z.string()).max(50).optional(),
    wait_timeout: z
      .string()
      .regex(/^[1-9][0-9]*(s|m|h)$/, 'Use a duration such as 30s, 5m or 1h')
      .optional(),
    max_processes: z.number().int().min(1).max(1000).optional(),
  })
);

export const getRunningProcessesOutputSchema = lazySchema(() =>
  z.object({
    status: z.enum(['success', 'partial', 'timed_out', 'failed']),
    error_code: z.string().optional(),
    action_ids: z.array(z.string()),
    results: z.array(
      z.object({
        endpoint_id: z.string(),
        agent_type: z.string(),
        status: z.enum(['success', 'failed', 'canceled', 'pending', 'dropped']),
        error: z.string().optional(),
        host_name: z.string().optional(),
        completed_at: z.string().optional(),
        process_count: z.number().optional(),
        processes: z
          .array(
            z.object({
              pid: z.string(),
              user: z.string(),
              command: z.string(),
              entity_id: z.string().optional(),
            })
          )
          .optional(),
      })
    ),
    dropped_endpoint_ids: z.array(z.string()),
    started_at: z.string(),
  })
);

export type GetRunningProcessesInput = z.infer<typeof getRunningProcessesInputSchema>;
export type GetRunningProcessesOutput = z.infer<typeof getRunningProcessesOutputSchema>;

export const getRunningProcessesStepCommonDefinition: BaseStepDefinition<
  typeof getRunningProcessesInputSchema,
  typeof getRunningProcessesOutputSchema
> = {
  id: GetRunningProcessesStepId,
  label: i18n.translate('xpack.securitySolution.workflows.steps.getRunningProcesses.label', {
    defaultMessage: 'Get Running Processes (Elastic Defend)',
  }),
  description: i18n.translate(
    'xpack.securitySolution.workflows.steps.getRunningProcesses.description',
    {
      defaultMessage:
        'List the processes running on Elastic Defend hosts and wait for each endpoint to answer. Never fails after the request is accepted: the outcome is returned in `status` (`success`, `partial`, `timed_out` or `failed`) with the `processes` of each endpoint in `results`.',
    }
  ),
  category: StepCategory.KibanaSecurity,
  inputSchema: getRunningProcessesInputSchema,
  outputSchema: getRunningProcessesOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.getRunningProcesses.documentation.details',
      {
        defaultMessage:
          'Sends one running-processes response action for `endpoint_ids` and waits up to `wait_timeout` (default 5m, maximum 1h). Each endpoint returns at most `max_processes` processes (default 100) with `process_count` holding the total.',
      }
    ),
    examples: [
      `## List processes on a host
\`\`\`yaml
- name: procs
  type: security.getRunningProcesses
  with:
    endpoint_ids:
      - "{{ inputs.endpoint_id }}"
    wait_timeout: 2m
\`\`\``,
    ],
  },
};
