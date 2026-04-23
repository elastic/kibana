/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { StepCategory } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';

export const NOISY_RULE_STEP_TYPE_ID = 'security.noisyRule';

export const NoisyRuleInputSchema = z.object({
  timeRange: z
    .string()
    .optional()
    .describe('How far back to look for alerts (ES date math). Defaults to "now-1h".'),
  threshold: z
    .number()
    .optional()
    .describe('Minimum alert count to consider a rule noisy. Defaults to 100.'),
  index: z
    .string()
    .optional()
    .describe('Override the alerts index pattern. Defaults to .alerts-security.alerts-<space_id>.'),
});

export const NoisyRuleOutputSchema = z.object({
  found: z.boolean().describe('Whether a rule exceeding the threshold was found.'),
  rule_id: z
    .string()
    .optional()
    .describe('The UUID of the noisiest rule (only present when found is true).'),
  rule_name: z
    .string()
    .optional()
    .describe('The name of the noisiest rule (only present when found is true).'),
  alert_count: z
    .number()
    .describe('Number of alerts from the noisiest rule in the time range.'),
});

export type NoisyRuleInput = z.infer<typeof NoisyRuleInputSchema>;
export type NoisyRuleOutput = z.infer<typeof NoisyRuleOutputSchema>;

export const noisyRuleStepCommonDefinition: CommonStepDefinition<
  typeof NoisyRuleInputSchema,
  typeof NoisyRuleOutputSchema
> = {
  id: NOISY_RULE_STEP_TYPE_ID,
  category: StepCategory.KibanaSecurity,
  label: i18n.translate('xpack.securitySolution.workflows.noisyRuleStep.label', {
    defaultMessage: 'Find Noisiest Detection Rule',
  }),
  description: i18n.translate('xpack.securitySolution.workflows.noisyRuleStep.description', {
    defaultMessage:
      'Aggregates open security alerts by rule over a time range and returns the rule that produced the most alerts.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.noisyRuleStep.documentation.details',
      {
        defaultMessage:
          'Queries the security alerts index, aggregates open alerts by rule UUID over the given time range, and returns the single noisiest rule. When the top rule has fewer alerts than the threshold, found is false.',
      }
    ),
    examples: [
      `## Find noisiest rule in last hour (default)
\`\`\`yaml
- name: noisy
  type: ${NOISY_RULE_STEP_TYPE_ID}
\`\`\``,

      `## Find noisiest rule in last 4 hours, threshold 50
\`\`\`yaml
- name: noisy
  type: ${NOISY_RULE_STEP_TYPE_ID}
  with:
    timeRange: "now-4h"
    threshold: 50
\`\`\``,
    ],
  },
  inputSchema: NoisyRuleInputSchema,
  outputSchema: NoisyRuleOutputSchema,
};
