/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { BaseStepDefinition } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';
import {
  EqlRulePatchProps,
  EsqlRulePatchProps,
  MachineLearningRulePatchProps,
  NewTermsRulePatchProps,
  QueryRulePatchProps,
  RuleResponse,
  SavedQueryRulePatchProps,
  ThreatMatchRulePatchProps,
  ThresholdRulePatchProps,
} from '../../../api/detection_engine/model/rule_schema/rule_schemas.gen';

export const PatchRuleStepId = 'security.patchRule' as const;

// "type" property is optional, but if you provide it in the editor,
// it'll narrow the editor completion and validation to that rule type's fields.
export const patchRuleInputSchema = z.object({
  patch: z.union([
    EqlRulePatchProps.extend({ type: z.literal('eql').optional() }),
    QueryRulePatchProps.extend({ type: z.literal('query').optional() }),
    SavedQueryRulePatchProps.extend({ type: z.literal('saved_query').optional() }),
    ThresholdRulePatchProps.extend({ type: z.literal('threshold').optional() }),
    ThreatMatchRulePatchProps.extend({ type: z.literal('threat_match').optional() }),
    MachineLearningRulePatchProps.extend({ type: z.literal('machine_learning').optional() }),
    NewTermsRulePatchProps.extend({ type: z.literal('new_terms').optional() }),
    EsqlRulePatchProps.extend({ type: z.literal('esql').optional() }),
  ]),
});

export const patchRuleOutputSchema = RuleResponse;

export const patchRuleStepCommonDefinition: BaseStepDefinition<
  typeof patchRuleInputSchema,
  typeof patchRuleOutputSchema
> = {
  id: PatchRuleStepId,
  label: i18n.translate('xpack.securitySolution.workflows.steps.patchRule.label', {
    defaultMessage: 'Patch Detection Rule',
  }),
  description: i18n.translate('xpack.securitySolution.workflows.steps.patchRule.description', {
    defaultMessage:
      'Patch fields of an existing detection rule identified by id or rule_id. Only the provided fields are changed. The rule type cannot be changed.',
  }),
  category: StepCategory.KibanaSecurity,
  inputSchema: patchRuleInputSchema,
  outputSchema: patchRuleOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.patchRule.documentation.details',
      {
        defaultMessage:
          'Partially updates a detection rule in current space via the Patch Rule API endpoint. The fields to patch are passed under the "patch" property and match the request body of that endpoint; see: https://www.elastic.co/docs/api/doc/kibana/operation/operation-patchrule for the fields of each rule type.',
      }
    ),
    examples: [
      `## Tune a threshold rule's threshold and severity values
\`\`\`yaml
- name: patch_rule
  type: security.patchRule
  with:
    patch:
      rule_id: my-threshold-rule
      type: threshold
      threshold:
        field:
          - host.name
        value: 200
      severity: medium
\`\`\``,
    ],
  },
};
