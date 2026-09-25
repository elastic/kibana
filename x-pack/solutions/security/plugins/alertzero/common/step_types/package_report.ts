/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { z } from '@kbn/zod/v4';

export const PACKAGE_REPORT_STEP_ID = 'hunt.packageReport' as const;

/** AI index Detection Watch's coverage sweep polls. Must stay in lockstep with coverage_worker.yaml. */
export const HUNT_COVERAGE_AI_INDEX_ID = 'security-investigations' as const;

const boundedId = z.string().trim().min(1).max(256);

export const packageReportInputSchema = z.object({
  spaceId: boundedId.describe('Space the Investigation lives in (S1; must match the workflow space).'),
  reportId: boundedId.describe('Threat report id this Investigation is bound to.'),
  investigationConversationId: boundedId.describe(
    'Investigation conversation id; must equal uuidv5(hunt:report:{reportId}).'
  ),
  runId: boundedId.describe('Current-run id; packaging reads only attachments scoped to this run.'),
});

const coverageWrittenSchema = z.object({
  kiId: z.string(),
  subject: z.string(),
});

const coverageSkippedSchema = z.object({
  kiId: z.string(),
  subject: z.string(),
  reason: z.enum(['disabled', 'denied', 'storage_failure', 'already_processed']),
});

export const packageReportMintPayloadSchema = z.object({
  /** Idempotency key: uuidv5(conversationId, endpointId, actionWorkflowId[, processKey]). */
  subjectKey: z.string(),
  conversationId: z.string(),
  comment: z.string(),
  category: z.string(),
  impact: z.string().optional(),
  actionWorkflowId: z.string().optional(),
  actionInput: z.record(z.string(), z.unknown()).optional(),
  /** Host name when the mint is host-scoped; absent on hostless actionless recommendations. */
  hostName: z.string().optional(),
  /** Reason an otherwise-needed mint omitted actionWorkflowId. */
  actionlessReason: z
    .enum([
      'catalog_error',
      'catalog_empty',
      'no_fillable_action',
      'hostless',
      'unenrolled',
    ])
    .optional(),
});

export const packageReportOutputSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('packaged'),
    coverage: z.object({
      written: z.array(coverageWrittenSchema),
      skipped: z.array(coverageSkippedSchema),
    }),
    proposals: z.array(packageReportMintPayloadSchema),
    dismiss: z.boolean(),
    closureSummary: z.string(),
    expectedProposalCount: z.number().int().min(0),
  }),
  z.object({
    status: z.literal('run_incomplete'),
    reason: z.string(),
  }),
]);

export type PackageReportInput = z.infer<typeof packageReportInputSchema>;
export type PackageReportOutput = z.infer<typeof packageReportOutputSchema>;
export type PackageReportMintPayload = z.infer<typeof packageReportMintPayloadSchema>;

export const packageReportStepCommonDefinition: CommonStepDefinition<
  typeof packageReportInputSchema,
  typeof packageReportOutputSchema
> = {
  id: PACKAGE_REPORT_STEP_ID,
  label: i18n.translate('xpack.alertzero.workflows.steps.packageReport.label', {
    defaultMessage: 'Package hunt report',
  }),
  description: i18n.translate('xpack.alertzero.workflows.steps.packageReport.description', {
    defaultMessage:
      'Decide mint-versus-dismiss for a Hunt Investigation run, write coverage KIs, and return gate mint payloads.',
  }),
  category: StepCategory.KibanaSecurity,
  stability: 'tech_preview',
  inputSchema: packageReportInputSchema,
  outputSchema: packageReportOutputSchema,
  documentation: {
    details: i18n.translate('xpack.alertzero.workflows.steps.packageReport.documentation.details', {
      defaultMessage:
        'Reads current-run SSE state from the Investigation, owns the mint-versus-dismiss decision table, ' +
        'writes pending security.coverage KIs (no-reset), resolves every fillable category:respond catalog ' +
        'action, commits hunt.expectedProposalCount, and returns mint payloads for the packaging child to ' +
        'dispatch as gate executions. Does not close the Investigation; dismiss is a boolean the child applies.',
    }),
    examples: [
      `## Package a hunt run
\`\`\`yaml
- name: decide_and_package
  type: ${PACKAGE_REPORT_STEP_ID}
  with:
    spaceId: "{{ workflow.spaceId }}"
    reportId: "{{ inputs.reportId }}"
    investigationConversationId: "{{ inputs.investigationConversationId }}"
    runId: "{{ inputs.runId }}"
\`\`\``,
    ],
  },
};
