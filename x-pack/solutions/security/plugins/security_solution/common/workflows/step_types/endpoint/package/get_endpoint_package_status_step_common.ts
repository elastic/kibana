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
import { endpointPartSchema, packagePartValues } from '../hosts/hosts_contracts';
import { packageConfigurationsSchema, packageInfoSchema } from './package_contracts';

export const GetEndpointPackageStatusStepId = 'security.getEndpointPackageStatus' as const;

export const getEndpointPackageStatusInputSchema = lazySchema(() =>
  z.object({
    include_configurations: z.boolean().optional().default(false),
  })
);

export const getEndpointPackageStatusOutputSchema = lazySchema(() =>
  z.object({
    package: packageInfoSchema.nullable(),
    stale: z.boolean().optional(),
    configurations: packageConfigurationsSchema.optional(),
    unauthorized: z.array(endpointPartSchema).max(packagePartValues.length),
    unavailable: z.array(endpointPartSchema).max(packagePartValues.length),
  })
);

export const getEndpointPackageStatusStepCommonDefinition: BaseStepDefinition<
  typeof getEndpointPackageStatusInputSchema,
  typeof getEndpointPackageStatusOutputSchema
> = {
  id: GetEndpointPackageStatusStepId,
  label: i18n.translate('xpack.securitySolution.workflows.steps.getEndpointPackageStatus.label', {
    defaultMessage: 'Get endpoint package status',
  }),
  description: i18n.translate(
    'xpack.securitySolution.workflows.steps.getEndpointPackageStatus.description',
    {
      defaultMessage:
        'Read the Elastic Defend integration version and, when include_configurations is true, its transform, index, pipeline and node configuration. This step is tech preview; its contract can change.',
    }
  ),
  category: StepCategory.KibanaSecurity,
  stability: 'tech_preview',
  inputSchema: getEndpointPackageStatusInputSchema,
  outputSchema: getEndpointPackageStatusOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.getEndpointPackageStatus.documentation.details',
      {
        defaultMessage:
          'Reads GET /api/fleet/epm/packages/endpoint and sets stale from the installed and latest versions. With include_configurations it also reads transform stats, transform and index settings, ingest pipelines and node roles. An unread part is absent and named in unauthorized or unavailable; a null package means the package document was not read.',
      }
    ),
    examples: [
      `## Check integration freshness and configuration
\`\`\`yaml
- name: package_status
  type: security.getEndpointPackageStatus
  with:
    include_configurations: true
\`\`\``,
    ],
  },
};
