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
import { truncationSchema } from '../../common/truncation';
import {
  MAX_HOST_RECORDS,
  MAX_HOST_TARGETS,
  boundedStringSchema,
  endpointPartSchema,
  hostRecordSchema,
  hostTargetSchema,
  resolvePartValues,
} from './hosts_contracts';

export const ResolveEndpointHostsStepId = 'security.resolveEndpointHosts' as const;

export const resolveEndpointHostsInputSchema = lazySchema(() =>
  z.object({
    targets: z.array(hostTargetSchema).min(1).max(MAX_HOST_TARGETS),
    expand_short_hostname: z.boolean().optional().default(false),
  })
);

export const resolveEndpointHostsResultSchema = lazySchema(() =>
  z.object({
    target: hostTargetSchema,
    status: boundedStringSchema,
    hosts: z.array(hostRecordSchema).max(MAX_HOST_RECORDS),
    truncation: truncationSchema,
    unauthorized: z.array(endpointPartSchema).max(resolvePartValues.length),
    unavailable: z.array(endpointPartSchema).max(resolvePartValues.length),
  })
);

export const resolveEndpointHostsOutputSchema = lazySchema(() =>
  z.object({
    results: z.array(resolveEndpointHostsResultSchema).max(MAX_HOST_TARGETS),
  })
);

export const resolveEndpointHostsStepCommonDefinition: BaseStepDefinition<
  typeof resolveEndpointHostsInputSchema,
  typeof resolveEndpointHostsOutputSchema
> = {
  id: ResolveEndpointHostsStepId,
  label: i18n.translate('xpack.securitySolution.workflows.steps.resolveEndpointHosts.label', {
    defaultMessage: 'Resolve endpoint hosts',
  }),
  description: i18n.translate(
    'xpack.securitySolution.workflows.steps.resolveEndpointHosts.description',
    {
      defaultMessage:
        'Resolve each target to the Elastic Defend hosts it matches, from endpoint metadata and Fleet enrollment records. Returns one record per target, in input order. This step is tech preview; its contract can change.',
    }
  ),
  category: StepCategory.KibanaSecurity,
  stability: 'tech_preview',
  inputSchema: resolveEndpointHostsInputSchema,
  outputSchema: resolveEndpointHostsOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.resolveEndpointHosts.documentation.details',
      {
        defaultMessage:
          'Reads GET /api/endpoint/metadata and GET /api/fleet/agents. A target with an agent_id is looked up by that id; a target with a hostname is looked up by name, with an optional short-name expansion. Each record has status resolved, ambiguous, not_found, unauthorized or unavailable, plus the host records, a truncation count and per-part unauthorized or unavailable lists.',
      }
    ),
    examples: [
      `## Resolve one hostname
\`\`\`yaml
- name: resolve
  type: security.resolveEndpointHosts
  with:
    targets:
      - hostname: my-host
    expand_short_hostname: true
\`\`\``,
    ],
  },
};
