/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import type { BaseStepDefinition } from '@kbn/workflows';
import {
  MAX_HOST_TARGETS,
  diagnosticsPartValues,
  endpointPartSchema,
  fleetAgentSchema,
  hostPolicyResponseSchema,
  idSchema,
} from './hosts_contracts';

export const GetEndpointHostDiagnosticsStepId = 'security.getEndpointHostDiagnostics' as const;

export const endpointHostDiagnosticsEntrySchema = lazySchema(() =>
  z.object({
    agent_id: idSchema,
    endpoint_id: idSchema.optional(),
  })
);

export const getEndpointHostDiagnosticsInputSchema = lazySchema(() =>
  z.object({
    hosts: z.array(endpointHostDiagnosticsEntrySchema).min(1).max(MAX_HOST_TARGETS),
    include_healthy: z.boolean().optional().default(true),
  })
);

export const endpointHostDiagnosticsResultSchema = lazySchema(() =>
  z.object({
    agent_id: idSchema,
    endpoint_id: idSchema.optional(),
    agent: fleetAgentSchema.nullable(),
    policy_response: hostPolicyResponseSchema.nullable(),
    unauthorized: z.array(endpointPartSchema).max(diagnosticsPartValues.length),
    unavailable: z.array(endpointPartSchema).max(diagnosticsPartValues.length),
  })
);

export const getEndpointHostDiagnosticsOutputSchema = lazySchema(() =>
  z.object({
    results: z.array(endpointHostDiagnosticsResultSchema).max(MAX_HOST_TARGETS),
  })
);

export const getEndpointHostDiagnosticsStepCommonDefinition: BaseStepDefinition<
  typeof getEndpointHostDiagnosticsInputSchema,
  typeof getEndpointHostDiagnosticsOutputSchema
> = {
  id: GetEndpointHostDiagnosticsStepId,
  label: i18n.translate('xpack.securitySolution.workflows.steps.getEndpointHostDiagnostics.label', {
    defaultMessage: 'Get endpoint host diagnostics',
  }),
  description: i18n.translate(
    'xpack.securitySolution.workflows.steps.getEndpointHostDiagnostics.description',
    {
      defaultMessage:
        'Read the Elastic Agent record and newest policy response for each host. Returns one record per host, in input order. This step is tech preview; its contract can change.',
    }
  ),
  category: StepCategory.KibanaSecurity,
  stability: 'tech_preview',
  inputSchema: getEndpointHostDiagnosticsInputSchema,
  outputSchema: getEndpointHostDiagnosticsOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.getEndpointHostDiagnostics.documentation.details',
      {
        defaultMessage:
          'Reads GET /api/fleet/agents/{agentId} and, when endpoint_id is set, GET /api/endpoint/policy_response. include_healthy keeps healthy components, units and actions; a null agent or policy_response means the document does not exist, was not read, or was not attempted. A per-record unauthorized or unavailable entry names the part that could not be read.',
      }
    ),
    examples: [
      `## Read one host's components
\`\`\`yaml
- name: host_diagnostics
  type: security.getEndpointHostDiagnostics
  with:
    hosts:
      - agent_id: 8f0e5c3a-1b2d-4f6a-9c7e-0d3b6a1e2f4c
        endpoint_id: 8f0e5c3a-1b2d-4f6a-9c7e-0d3b6a1e2f4c
    include_healthy: false
\`\`\``,
    ],
  },
};
