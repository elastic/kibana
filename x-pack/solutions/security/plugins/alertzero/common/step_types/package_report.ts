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

/**
 * Upper bound on per-proposal bullets embedded in the run conclusion. The conclusion lands in a
 * journal note whose `message` is capped at 8,000 characters (`journal_note.yaml`); uncapped,
 * 50 hosts x 2 actions overflowed it and failed the note's input validation.
 */
export const MAX_SUMMARY_PROPOSAL_BULLETS = 20;

/**
 * Character budget for the bullets, as well as the count cap above: titles (256) and host names
 * (schema allows far more than a DNS name) are variable-length, so a count alone does not bound
 * the note. Sits well under the 8,000 limit to leave room for the rest of the conclusion.
 */
export const MAX_SUMMARY_BULLETS_CHARS = 5000;

const boundedId = z.string().trim().min(1).max(256);

export const packageReportInputSchema = z.object({
  spaceId: boundedId.describe(
    'Space the Investigation lives in (S1; must match the workflow space).'
  ),
  reportId: boundedId.describe('Threat report id this Investigation is bound to.'),
  investigationConversationId: boundedId.describe(
    'Investigation conversation id; must equal uuidv5(hunt:report:{reportId}).'
  ),
  runId: boundedId.describe('Current-run id; packaging reads only attachments scoped to this run.'),
  /**
   * The hunt child's own verdict, threaded through so packaging can tell a run that found
   * nothing from one that could not finish. Without it, both look identical here: neither
   * leaves a current-run SSE attachment behind, because the coordinator only emits one for a
   * confirmed hit.
   */
  huntStatus: z
    .enum(['success', 'partial', 'failed'])
    .describe(
      "Hunt child's result status: `success` when the run covered what it was asked to, `partial` when a tier could not finish, `failed` when the coordinator call failed or was skipped."
    ),
  hasConfirmedHit: z
    .boolean()
    .describe(
      "Whether the hunt cleared the confirmed-hit bar (the coordinator's top-level `has_confirmed_hit`: a required-or-baseline index hit from Tier 1, or a Tier 2 behavior that executed and hit). False covers both an environment that is clean and one where nothing was searchable."
    ),
  /**
   * Number of SSE attachments the hunt child prepared for this run (`hunt.yaml`'s `sse_count`
   * output). Compared against the current-run SSE attachments packaging actually finds: the
   * hunt's `attach_sse` foreach swallows a per-item attach failure with `continue`, so without
   * this count a shortfall is invisible and packaging would read a partial finding set as
   * complete.
   *
   * Optional, not required: this workflow is a plain `yaml` definition, so its own content
   * hash propagates to every space on the next reconciliation regardless of version, but the
   * Worker that calls it (`hunt_continuous_threat_hunt.ts`) is a `yamlTemplate` definition,
   * whose hash covers only the function source, not the imported YAML it renders -- an
   * already-installed Worker only picks up the call site that supplies this field once its own
   * `version` bumps. Making it required here would fail every such Worker's packaging call in
   * the gap between the two. Omitting it instead skips the shortfall check below, which is the
   * same as not having this fix yet -- never a hard failure.
   */
  expectedSseCount: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe(
      'Number of significant security event attachments the hunt child prepared for this run (its `sse_count` output). A packaging read that finds fewer than this is a partial attach, reported as `run_incomplete` rather than packaged. Omit to skip the shortfall check (e.g. an already-installed Worker that does not supply it yet).'
    ),
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
  /** Short plain-text label naming what is proposed; omitting it falls back to the action's own name. */
  title: z.string().max(256).optional(),
  comment: z.string(),
  category: z.string(),
  impact: z.string().optional(),
  actionWorkflowId: z.string().optional(),
  actionInput: z.record(z.string(), z.unknown()).optional(),
  /** Host name when the mint is host-scoped; absent on a hostless analyst recommendation. */
  hostName: z.string().optional(),
  confidence: z.enum(['low', 'medium', 'high']).optional(),
});

export const packageReportOutputSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('packaged'),
    coverage: z.object({
      written: z.array(coverageWrittenSchema),
      skipped: z.array(coverageSkippedSchema),
    }),
    proposals: z.array(packageReportMintPayloadSchema),
    /**
     * Bounded markdown bullets, one per proposal up to `MAX_SUMMARY_PROPOSAL_BULLETS`, for the run
     * conclusion's prose. `proposals` itself stays complete because it drives the gate fan-out; this
     * is only what gets embedded in the journal note, whose `message` is capped at 8,000 characters.
     */
    proposalBullets: z
      .array(z.string().max(MAX_SUMMARY_BULLETS_CHARS))
      .max(MAX_SUMMARY_PROPOSAL_BULLETS),
    /** Proposals past the bullet cap that the prose states as a count instead of listing. */
    omittedProposalCount: z.number().int().min(0),
    dismiss: z.boolean(),
    closureSummary: z.string(),
    expectedProposalCount: z.number().int().min(0),
    /**
     * `none` unless this run found something mint-worthy and `proposals` was forced empty rather
     * than minting a second, unrelated chain for what may be the same finding -- a conservative
     * guard until the Proposals service owns real dedup keyed on `subjectKey` (see that field's own
     * comment on `packageReportMintPayloadSchema` above). The two non-`none` values both fail
     * closed (never risk a duplicate mint), but for different reasons the run conclusion has to
     * tell apart: `existing_proposals` means the lookup found one and the analyst should go review
     * it; `check_failed` means the lookup itself failed, so there may be nothing to review at all.
     * A single enum rather than two booleans so a reader (and the Liquid prose branching on it)
     * cannot see the unrepresentable "check failed but nothing was skipped" combination.
     *
     * Temporary contract surface: removed once `deduplicationKey` lands and the mint path dedupes
     * for real instead of suppressing wholesale.
     */
    mintSuppression: z.enum(['none', 'existing_proposals', 'check_failed']),
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
        'action, and returns mint payloads (including expectedProposalCount, the settlement barrier the ' +
        'packaging child threads into each gate) for the packaging child to dispatch as gate executions. ' +
        'A completed hunt that confirmed no hit leaves no current-run SSE attachment, so it packages as a ' +
        'dismissal off huntStatus and hasConfirmedHit. A hunt that did not complete returns run_incomplete ' +
        'instead, because its report may still be hunted again into this same Investigation. ' +
        'Does not close the Investigation; dismiss is a boolean the child applies.',
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
    huntStatus: "{{ inputs.huntStatus }}"
    hasConfirmedHit: "\${{ inputs.hasConfirmedHit }}"
    expectedSseCount: "\${{ inputs.expectedSseCount }}"
\`\`\``,
    ],
  },
};
