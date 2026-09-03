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
  RuleCreateProps,
  RuleResponse,
} from '../../../api/detection_engine/model/rule_schema/rule_schemas.gen';

export const CreateRuleStepId = 'security.createRule' as const;

export const createRuleInputSchema = z.object({ rule: RuleCreateProps });

export const createRuleOutputSchema = RuleResponse;

export const createRuleStepCommonDefinition: BaseStepDefinition<
  typeof createRuleInputSchema,
  typeof createRuleOutputSchema
> = {
  id: CreateRuleStepId,
  label: i18n.translate('xpack.securitySolution.workflows.steps.createRule.label', {
    defaultMessage: 'Create Detection Rule',
  }),
  description: i18n.translate('xpack.securitySolution.workflows.steps.createRule.description', {
    defaultMessage: 'Create a new, disabled detection rule from a rule object.',
  }),
  category: StepCategory.KibanaSecurity,
  inputSchema: createRuleInputSchema,
  outputSchema: createRuleOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.createRule.documentation.details',
      {
        defaultMessage:
          'Creates a detection rule in current space via Create Detection Rule API endpoint. The rule object is passed under the "rule" property and must match the request body of that endpoint; see: https://www.elastic.co/docs/api/doc/kibana/operation/operation-createrule for the fields of each rule type. The rule is always created disabled, so "rule.enabled" is ignored. Add a "security.enableRule" step to activate it.',
      }
    ),
    examples: [
      `## Create a disabled ES|QL rule
\`\`\`yaml
- name: create_rule
  type: security.createRule
  with:
    rule:
      type: esql
      language: esql
      name: Suspicious PowerShell Execution
      description: Detects suspicious PowerShell activity
      query: FROM logs-endpoint.events.process-* | WHERE process.name == "powershell.exe"
      severity: high
      risk_score: 73
\`\`\``,
    ],
  },
};
