/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { z } from '@kbn/zod/v4';
import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { i18n } from '@kbn/i18n';

const inputSchema = z.object({
  ruleId: z.string().describe('The rule ID to get metadata for'),
});

const outputSchema = z.object({
  rule_id: z.string(),
  metadata: z.object({
    rule_id: z.string(),
    rule_name: z.string().optional(),
    rule_uuid: z.string().optional(),
    rule_description: z.string().optional(),
    rule_category: z.string().optional(),
    rule_type: z.string().optional(),
    severity: z.string().optional(),
    references: z.array(z.string()).optional(),
    threat_framework: z.string().optional(),
    threat_tactic: z
      .object({
        id: z.string().optional(),
        name: z.string(),
      })
      .optional(),
    threat_technique: z
      .object({
        id: z.string().optional(),
        name: z.string(),
      })
      .optional(),
  }),
  message: z.string(),
  note: z.string().optional(),
});

export const getRuleMetadataStepDefinition: PublicStepDefinition = {
  id: 'security.getRuleMetadata',
  inputSchema,
  outputSchema,
  label: i18n.translate('securitySolution.workflows.steps.getRuleMetadata.label', {
    defaultMessage: 'Get Rule Metadata',
  }),
  description: i18n.translate('securitySolution.workflows.steps.getRuleMetadata.description', {
    defaultMessage: 'Get rule metadata including severity, rule type, category, and other rule information',
  }),
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/list').then(({ icon }) => ({ default: icon }))
  ),
  documentation: {
    details: i18n.translate('securitySolution.workflows.steps.getRuleMetadata.documentation.details', {
      defaultMessage: 'Retrieves metadata about a rule including its name, description, category, severity, and MITRE ATT&CK mappings.',
    }),
    examples: [
      `## Get rule metadata
\`\`\`yaml
- name: get_metadata
  type: security.getRuleMetadata
  with:
    ruleId: "{{ event.alerts[0].kibana.alert.rule.rule_id }}"
\`\`\``,
    ],
  },
};

