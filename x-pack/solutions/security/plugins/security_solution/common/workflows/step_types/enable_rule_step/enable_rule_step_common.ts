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

export const EnableRuleStepId = 'security.enableRule' as const;

export const enableRuleInputSchema = bulkRuleSelectorSchema;
export const enableRuleOutputSchema = bulkRuleSummaryOutputSchema;

export const enableRuleStepCommonDefinition: BaseStepDefinition<
  typeof enableRuleInputSchema,
  typeof enableRuleOutputSchema
> = {
  id: EnableRuleStepId,
  label: i18n.translate('xpack.securitySolution.workflows.steps.enableRule.label', {
    defaultMessage: 'Enable Detection Rule',
  }),
  description: i18n.translate('xpack.securitySolution.workflows.steps.enableRule.description', {
    defaultMessage:
      'Enable one or more detection rules. Succeeds when at least one selected rule is enabled or skipped (already enabled), reporting any per-rule failures in `errors`; fails only when every selected rule fails (including "not found"). To handle outcomes per rule, use foreach over a search result.',
  }),
  category: StepCategory.KibanaSecurity,
  inputSchema: enableRuleInputSchema,
  outputSchema: enableRuleOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.enableRule.documentation.details',
      {
        defaultMessage:
          'Enables detection rules selected by `ids` (rule UUIDs) or by a KQL `query`. Exactly one selector must be provided. Returns a summary with succeeded/failed/skipped counts, plus an `errors` array describing each rule that failed on a partial success.',
      }
    ),
    examples: [
      `## Enable a single rule by id
\`\`\`yaml
- name: enable_rule
  type: security.enableRule
  with:
    ids:
      - "{{ variables.rule_id }}"
\`\`\``,
      `## Enable every rule matching a query
\`\`\`yaml
- name: enable_high_severity_rules
  type: security.enableRule
  with:
    query: 'alert.attributes.params.severity: high'
\`\`\``,
    ],
  },
};
