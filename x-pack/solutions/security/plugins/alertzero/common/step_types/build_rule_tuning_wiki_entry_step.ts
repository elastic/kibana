/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { z, lazySchema } from '@kbn/zod/v4';

export const BuildRuleTuningWikiEntryStepId = 'alertzero.buildRuleTuningWikiEntry' as const;

/** The proposal store's own bound on an analyst's typed reason. */
export const MAX_ANALYST_REASON_LENGTH = 4096;

/**
 * How much of each model-written field an entry keeps. The diagnosis schema does not bound its
 * text, so longer text is cut to these lengths instead of failing the step.
 */
export const MODEL_EXCERPT_LENGTHS = {
  title: 256,
  summary: 1000,
  fp_pattern: 1000,
  reasoning: 2000,
} as const;

/** Liquid renders a missing value as `''`; treat it (and `null`) as absent. */
const toAbsent = (value: unknown): unknown => (value === '' || value === null ? undefined : value);

const modelText = (maxLength: number, description: string) =>
  z
    .preprocess(
      (value) => {
        const present = toAbsent(value);
        return typeof present === 'string' && present.length > maxLength
          ? `${present.slice(0, maxLength)}…`
          : present;
      },
      z
        .string()
        .max(maxLength + 1)
        .optional()
    )
    .describe(description);

export const buildRuleTuningWikiEntryStepInputSchema = lazySchema(() =>
  z.object({
    proposal_id: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/)
      .describe('The decided tuning proposal; the entry is recorded under this id.'),
    rule_name: z
      .string()
      .max(1024)
      .describe('The rule name when the review ran. The page is keyed on the saved-object id.'),
    proposal: z
      .object({
        decision: z.enum(['approved', 'dismissed']),
        status: z.string().max(64),
        decidedBy: z
          .object({ username: z.preprocess(toAbsent, z.string().max(1024).optional()) })
          .optional(),
        dismissReason: z.preprocess(toAbsent, z.string().max(64).optional()),
        rationale: z.preprocess(toAbsent, z.string().max(MAX_ANALYST_REASON_LENGTH).optional()),
      })
      .describe('Output of `proposals.getProposal` for the decided proposal.'),
    diagnosis: z
      .object({
        change_type: z.preprocess(toAbsent, z.string().max(64).optional()),
        confidence: z.preprocess(toAbsent, z.string().max(64).optional()),
        title: modelText(MODEL_EXCERPT_LENGTHS.title, 'Proposal title the model wrote'),
        summary: modelText(MODEL_EXCERPT_LENGTHS.summary, 'Why the model proposed the change'),
        fp_pattern: modelText(MODEL_EXCERPT_LENGTHS.fp_pattern, 'The benign pattern the model saw'),
        reasoning: modelText(MODEL_EXCERPT_LENGTHS.reasoning, "The model's numbered reasoning"),
      })
      .describe('The structured diagnosis the proposal was built from.'),
  })
);

export const buildRuleTuningWikiEntryStepOutputSchema = lazySchema(() =>
  z.object({
    entry_id: z.string().max(128).describe('Id to record the entry under.'),
    content: z.string().max(16_000).describe('The entry, as Markdown.'),
  })
);

export const buildRuleTuningWikiEntryStepCommonDefinition: CommonStepDefinition<
  typeof buildRuleTuningWikiEntryStepInputSchema,
  typeof buildRuleTuningWikiEntryStepOutputSchema
> = {
  id: BuildRuleTuningWikiEntryStepId,
  label: i18n.translate('xpack.alertzero.workflows.steps.buildRuleTuningWikiEntry.label', {
    defaultMessage: 'Build Rule Tuning decision entry',
  }),
  description: i18n.translate(
    'xpack.alertzero.workflows.steps.buildRuleTuningWikiEntry.description',
    {
      defaultMessage:
        "Writes an analyst's decision on a tuning proposal as one entry for the rule's wiki page.",
    }
  ),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: buildRuleTuningWikiEntryStepInputSchema,
  outputSchema: buildRuleTuningWikiEntryStepOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.alertzero.workflows.steps.buildRuleTuningWikiEntry.documentation.details',
      {
        defaultMessage:
          "The entry records the decision, who made it, the dismiss reason and the analyst's typed reason word for word. It quotes excerpts of the diagnosis and marks them as unverified model output. It writes nothing itself: pass its output to agentKnowledge.recordEntry.",
      }
    ),
    examples: [
      `- name: build_decision_entry
  type: alertzero.buildRuleTuningWikiEntry
  with:
    proposal_id: "{{ steps.resolve_tuning_proposal.output.proposal_id }}"
    rule_name: "{{ steps.fetch_rule.output.name }}"
    proposal: "\${{ steps.read_tuning_decision.output }}"
    diagnosis: "\${{ steps.diagnose_rule.output.structured_output }}"`,
    ],
  },
};
