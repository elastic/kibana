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
import { MAX_INPUT_STRING_CHARS } from '../../common/budget';
import {
  getEndpointHostDiagnosticsOutputSchema,
  getEndpointInventoryCountsOutputSchema,
  resolveEndpointHostsOutputSchema,
} from '../hosts';
import { getEndpointPackageStatusOutputSchema } from '../package';
import { troubleshootingDiagnosisSchema } from './contracts/diagnosis';

const stepExecutionEnvelopeSchema = <TOutput extends z.ZodType>(outputSchema: TOutput) =>
  z.object({
    input: z.unknown().optional(),
    output: outputSchema.nullish(),
    error: z.unknown().optional(),
  });

export const FinalizeTroubleshootingDiagnosisStepId =
  'security.finalizeTroubleshootingDiagnosis' as const;

export const finalizeTroubleshootingDiagnosisInputSchema = lazySchema(() =>
  z.object({
    resolve: stepExecutionEnvelopeSchema(resolveEndpointHostsOutputSchema).optional(),
    host_diagnostics: stepExecutionEnvelopeSchema(
      getEndpointHostDiagnosticsOutputSchema
    ).optional(),
    package_status: stepExecutionEnvelopeSchema(getEndpointPackageStatusOutputSchema).optional(),
    inventory_counts: stepExecutionEnvelopeSchema(
      getEndpointInventoryCountsOutputSchema
    ).optional(),
    target_requested: z.boolean(),
    include_configurations: z.boolean(),
    started_at: z.string().max(MAX_INPUT_STRING_CHARS),
  })
);

export const finalizeTroubleshootingDiagnosisStepCommonDefinition: BaseStepDefinition<
  typeof finalizeTroubleshootingDiagnosisInputSchema,
  typeof troubleshootingDiagnosisSchema
> = {
  id: FinalizeTroubleshootingDiagnosisStepId,
  label: i18n.translate(
    'xpack.securitySolution.workflows.steps.finalizeTroubleshootingDiagnosis.label',
    {
      defaultMessage: 'Finalize troubleshooting diagnosis',
    }
  ),
  description: i18n.translate(
    'xpack.securitySolution.workflows.steps.finalizeTroubleshootingDiagnosis.description',
    {
      defaultMessage:
        'Combine the Elastic Defend host, package and inventory reads into one Automatic Troubleshooting diagnosis: the target, health class, caveats and telemetry. This step is tech preview; its contract can change.',
    }
  ),
  category: StepCategory.KibanaSecurity,
  stability: 'tech_preview',
  inputSchema: finalizeTroubleshootingDiagnosisInputSchema,
  outputSchema: troubleshootingDiagnosisSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.finalizeTroubleshootingDiagnosis.documentation.details',
      {
        defaultMessage:
          'Takes each diagnose sub-step as its whole step value, so a skipped step is absent and a failed step carries an error. Classifies the host health on the full diagnostics output, projects the diagnosis to its bounds, and records dropped rows in omitted. A step that is expected but missing adds unavailable:<part> for each part it owns.',
      }
    ),
    examples: [
      `## Finalize a diagnosis
\`\`\`yaml
- name: finalize
  type: security.finalizeTroubleshootingDiagnosis
  with:
    resolve: "\${{ steps.resolve }}"
    host_diagnostics: "\${{ steps.host_diagnostics }}"
    package_status: "\${{ steps.package_status }}"
    inventory_counts: "\${{ steps.inventory_counts }}"
    target_requested: "\${{ inputs.hostname != blank }}"
    include_configurations: false
    started_at: "\${{ execution.startedAt }}"
\`\`\``,
    ],
  },
};
