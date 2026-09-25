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

export const FIND_OR_CREATE_INVESTIGATION_STEP_ID = 'hunt.findOrCreateInvestigation' as const;

const boundedId = z.string().trim().min(1).max(256);

export const findOrCreateInvestigationInputSchema = z.object({
  reportId: boundedId.describe(
    'Threat report id to find-or-create a Hunt Watch Investigation for.'
  ),
});

export const findOrCreateInvestigationOutputSchema = z.object({
  investigationConversationId: z
    .string()
    .describe('uuidv5(hunt:report:{reportId}); minted or verified existing.'),
  triggerAttachmentId: z
    .string()
    .describe(
      "trigger-{sha256(space|reportId)}; the security.threat attachment id the caller attaches to name this Investigation's report."
    ),
});

export type FindOrCreateInvestigationInput = z.infer<typeof findOrCreateInvestigationInputSchema>;
export type FindOrCreateInvestigationOutput = z.infer<
  typeof findOrCreateInvestigationOutputSchema
>;

export const findOrCreateInvestigationStepCommonDefinition: CommonStepDefinition<
  typeof findOrCreateInvestigationInputSchema,
  typeof findOrCreateInvestigationOutputSchema
> = {
  id: FIND_OR_CREATE_INVESTIGATION_STEP_ID,
  label: i18n.translate('xpack.alertzero.workflows.steps.findOrCreateInvestigation.label', {
    defaultMessage: 'Find or create Hunt Watch Investigation',
  }),
  description: i18n.translate(
    'xpack.alertzero.workflows.steps.findOrCreateInvestigation.description',
    {
      defaultMessage:
        'Mints the deterministic Investigation conversation id for a report and creates it, or verifies an existing one on a conflict.',
    }
  ),
  category: StepCategory.KibanaSecurity,
  stability: 'tech_preview',
  inputSchema: findOrCreateInvestigationInputSchema,
  outputSchema: findOrCreateInvestigationOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.alertzero.workflows.steps.findOrCreateInvestigation.documentation.details',
      {
        defaultMessage:
          'Derives the Investigation id via uuidv5(hunt:report:{reportId}) and creates the conversation. ' +
          'A verified 409 (the Investigation already exists for this subject key) is treated as success: ' +
          'the existing conversation is read back to confirm it is reachable before returning its id. ' +
          'No route call: the deterministic id cannot be computed in workflow YAML, so this step owns the ' +
          'derivation and the conflict handling atomically rather than composing generic ai.conversation.* steps.',
      }
    ),
    examples: [
      `## Find or create the Investigation for a report
\`\`\`yaml
- name: find_or_create_investigation
  type: ${FIND_OR_CREATE_INVESTIGATION_STEP_ID}
  with:
    reportId: "{{ inputs.reportId }}"
\`\`\``,
    ],
  },
};
