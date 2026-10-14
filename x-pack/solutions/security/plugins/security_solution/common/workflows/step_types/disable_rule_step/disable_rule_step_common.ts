/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StepCategory } from '@kbn/workflows';
import type { BaseStepDefinition } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';
import { bulkRuleSelectorSchema, bulkRuleSummaryOutputSchema } from '../common/bulk_action_schemas';

export const DisableRuleStepId = 'security.disableRule' as const;

export const disableRuleInputSchema = bulkRuleSelectorSchema;
export const disableRuleOutputSchema = bulkRuleSummaryOutputSchema;

export const disableRuleStepCommonDefinition: BaseStepDefinition<
  typeof disableRuleInputSchema,
  typeof disableRuleOutputSchema
> = {
  id: DisableRuleStepId,
  label: i18n.translate('xpack.securitySolution.workflows.steps.disableRule.label', {
    defaultMessage: 'Disable Detection Rule',
  }),
  description: i18n.translate('xpack.securitySolution.workflows.steps.disableRule.description', {
    defaultMessage:
      'Disable one or more detection rules. Succeeds when at least one selected rule is disabled or skipped (already disabled), reporting any per-rule failures in `errors`; fails only when every selected rule fails (including "not found"). To handle outcomes per rule, use foreach over a search result.',
  }),
  category: StepCategory.KibanaSecurity,
  inputSchema: disableRuleInputSchema,
  outputSchema: disableRuleOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.disableRule.documentation.details',
      {
        defaultMessage:
          'Disables detection rules selected by `ids` (rule UUIDs) or by a KQL `query`. Exactly one selector must be provided. Returns a summary with succeeded/failed/skipped counts, plus an `errors` array describing each rule that failed on a partial success.',
      }
    ),
    examples: [
      `## Disable a single rule by id
\`\`\`yaml
- name: disable_rule
  type: security.disableRule
  with:
    ids:
      - "{{ variables.rule_id }}"
\`\`\``,
      `## Disable every rule matching a query
\`\`\`yaml
- name: disable_noisy_rules
  type: security.disableRule
  with:
    query: 'alert.attributes.tags: noisy'
\`\`\``,
    ],
  },
};
