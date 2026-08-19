/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StepCategory } from '@kbn/workflows';
import type { BaseStepDefinition } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';
import {
  EsqlRule,
  EsqlRuleCreateProps,
} from '../../../api/detection_engine/model/rule_schema/rule_schemas.gen';

export const CreateRuleStepId = 'security.createRule' as const;

export const createRuleInputSchema = EsqlRuleCreateProps;

export const createRuleOutputSchema = EsqlRule;

export const createRuleStepCommonDefinition: BaseStepDefinition<
  typeof createRuleInputSchema,
  typeof createRuleOutputSchema
> = {
  id: CreateRuleStepId,
  label: i18n.translate('xpack.securitySolution.workflows.steps.createRule.label', {
    defaultMessage: 'Create Detection Rule',
  }),
  description: i18n.translate('xpack.securitySolution.workflows.steps.createRule.description', {
    defaultMessage:
      'Create a new detection rule from passed rule parameters. Only ES|QL rules are supported for now.',
  }),
  category: StepCategory.KibanaSecurity,
  inputSchema: createRuleInputSchema,
  outputSchema: createRuleOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.createRule.documentation.details',
      {
        defaultMessage:
          'Creates a detection rule in current space via Create Detection Rule API endpoint. For a list of input parameters, see: https://www.elastic.co/docs/api/doc/kibana/operation/operation-createrule#operation-createrule-body-application-json-esql-object',
      }
    ),
    examples: [
      `## Create a disabled ES|QL rule
\`\`\`yaml
- name: create_rule
  type: security.createRule
  with:
    type: esql
    language: esql
    name: Suspicious PowerShell Execution
    description: Detects suspicious PowerShell activity
    query: FROM logs-endpoint.events.process-* | WHERE process.name == "powershell.exe"
    severity: high
    risk_score: 73
    enabled: false
\`\`\``,
    ],
  },
};
