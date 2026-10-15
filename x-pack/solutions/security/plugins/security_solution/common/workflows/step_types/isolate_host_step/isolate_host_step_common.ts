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

export const IsolateHostStepId = 'security.isolateHost' as const;

export const isolateHostInputSchema = lazySchema(() =>
  z.object({
    endpoint_ids: z.array(z.string().min(1)).min(1).max(250),
    comment: z.string().max(30000).optional(),
    alert_ids: z.array(z.string()).max(50).optional(),
    case_ids: z.array(z.string()).max(50).optional(),
    wait_timeout: z
      .string()
      .regex(/^[1-9][0-9]*(s|m|h)$/, 'Use a duration such as 30s, 5m or 1h')
      .optional(),
  })
);

export const isolateHostResultStatusSchema = lazySchema(() =>
  z.enum(['success', 'failed', 'canceled', 'pending', 'dropped'])
);

export const isolateHostOutputSchema = lazySchema(() =>
  z.object({
    status: z.enum(['success', 'partial', 'timed_out', 'failed']),
    error_code: z.string().optional(),
    action_ids: z.array(z.string()),
    results: z.array(
      z.object({
        endpoint_id: z.string(),
        agent_type: z.string(),
        status: isolateHostResultStatusSchema,
        error: z.string().optional(),
        host_name: z.string().optional(),
        completed_at: z.string().optional(),
      })
    ),
    dropped_endpoint_ids: z.array(z.string()),
    started_at: z.string(),
  })
);

export type IsolateHostInput = z.infer<typeof isolateHostInputSchema>;
export type IsolateHostOutput = z.infer<typeof isolateHostOutputSchema>;
export type IsolateHostResultStatus = z.infer<typeof isolateHostResultStatusSchema>;

export const isolateHostStepCommonDefinition: BaseStepDefinition<
  typeof isolateHostInputSchema,
  typeof isolateHostOutputSchema
> = {
  id: IsolateHostStepId,
  label: i18n.translate('xpack.securitySolution.workflows.steps.isolateHost.label', {
    defaultMessage: 'Isolate Host (Elastic Defend)',
  }),
  description: i18n.translate('xpack.securitySolution.workflows.steps.isolateHost.description', {
    defaultMessage:
      'Isolate one or more Elastic Defend hosts and wait for each endpoint to answer. Never fails after the isolate request is accepted: the outcome is returned in `status` (`success`, `partial`, `timed_out` or `failed`) with a per-endpoint `results` list.',
  }),
  category: StepCategory.KibanaSecurity,
  inputSchema: isolateHostInputSchema,
  outputSchema: isolateHostOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.isolateHost.documentation.details',
      {
        defaultMessage:
          'Sends one isolate response action for `endpoint_ids` and waits up to `wait_timeout` (default 15m, maximum 1h) for the endpoints to answer. Endpoint ids the route did not act on are listed in `dropped_endpoint_ids`.',
      }
    ),
    examples: [
      `## Isolate a host and wait up to 5 minutes
\`\`\`yaml
- name: isolate
  type: security.isolateHost
  with:
    endpoint_ids:
      - "{{ inputs.endpoint_id }}"
    comment: "Isolated by workflow"
    wait_timeout: 5m
\`\`\``,
    ],
  },
};
