/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  AiPolicy,
  AiPolicyInput,
  AiPolicyProvider,
} from '../../../../../common/entity_intelligence/ai_policies';

export const policyProviderLabels: Record<AiPolicyProvider, string> = {
  google_adk: i18n.translate(
    'xpack.securitySolution.entityIntelligence.policies.provider.googleAdk',
    {
      defaultMessage: 'Google ADK',
    }
  ),
  claude_desktop: i18n.translate(
    'xpack.securitySolution.entityIntelligence.policies.provider.claudeDesktop',
    {
      defaultMessage: 'Claude Desktop',
    }
  ),
  cursor: i18n.translate('xpack.securitySolution.entityIntelligence.policies.provider.cursor', {
    defaultMessage: 'Cursor',
  }),
  agent_builder: i18n.translate(
    'xpack.securitySolution.entityIntelligence.policies.provider.builder',
    { defaultMessage: 'Agent Builder' }
  ),
  codex: i18n.translate('xpack.securitySolution.entityIntelligence.policies.provider.codex', {
    defaultMessage: 'Codex',
  }),
};

export const policyActivityLabels: Record<AiPolicyInput['activityType'], string> = {
  protected_file_access: i18n.translate(
    'xpack.securitySolution.entityIntelligence.policies.activity.file',
    { defaultMessage: 'Protected file access' }
  ),
  unapproved_export: i18n.translate(
    'xpack.securitySolution.entityIntelligence.policies.activity.export',
    { defaultMessage: 'Unapproved export' }
  ),
  restricted_tool_use: i18n.translate(
    'xpack.securitySolution.entityIntelligence.policies.activity.tool',
    { defaultMessage: 'Restricted tool use' }
  ),
};

export const policySeverityLabels: Record<AiPolicyInput['severity'], string> = {
  low: i18n.translate('xpack.securitySolution.entityIntelligence.policies.severity.low', {
    defaultMessage: 'Low',
  }),
  medium: i18n.translate('xpack.securitySolution.entityIntelligence.policies.severity.medium', {
    defaultMessage: 'Medium',
  }),
  high: i18n.translate('xpack.securitySolution.entityIntelligence.policies.severity.high', {
    defaultMessage: 'High',
  }),
  critical: i18n.translate('xpack.securitySolution.entityIntelligence.policies.severity.critical', {
    defaultMessage: 'Critical',
  }),
};

export const emptyPolicy = (): AiPolicyInput => ({
  name: '',
  description: '',
  enabled: true,
  mode: 'monitor',
  providers: ['cursor', 'agent_builder'],
  activityType: 'protected_file_access',
  severity: 'high',
  toolNames: [],
  inputContains: '',
});

/** Removes server-owned revision and attribution fields before saving a policy. */
export const editablePolicy = (policy: AiPolicy): AiPolicyInput => ({
  name: policy.name,
  description: policy.description,
  enabled: policy.enabled,
  mode: 'monitor',
  providers: [...policy.providers],
  activityType: policy.activityType,
  severity: policy.severity,
  toolNames: [...policy.toolNames],
  inputContains: policy.inputContains,
});

export const policyTemplates: Array<{ input: AiPolicyInput; icon: string; description: string }> = [
  {
    icon: 'lock',
    description: i18n.translate(
      'xpack.securitySolution.entityIntelligence.policies.template.file.description',
      { defaultMessage: 'Spot tool inputs that reference a sensitive file or path.' }
    ),
    input: {
      ...emptyPolicy(),
      name: i18n.translate(
        'xpack.securitySolution.entityIntelligence.policies.template.file.name',
        { defaultMessage: 'Protected file access' }
      ),
      inputContains: 'protected-customer-data.csv',
    },
  },
  {
    icon: 'export',
    description: i18n.translate(
      'xpack.securitySolution.entityIntelligence.policies.template.export.description',
      { defaultMessage: 'Flag an export destination in the recorded tool input.' }
    ),
    input: {
      ...emptyPolicy(),
      name: i18n.translate(
        'xpack.securitySolution.entityIntelligence.policies.template.export.name',
        { defaultMessage: 'Unapproved data export' }
      ),
      activityType: 'unapproved_export',
      inputContains: 'unapproved-export.example',
    },
  },
  {
    icon: 'commandLine',
    description: i18n.translate(
      'xpack.securitySolution.entityIntelligence.policies.template.tool.description',
      { defaultMessage: 'Detect use of an exact tool name in selected agents.' }
    ),
    input: {
      ...emptyPolicy(),
      name: i18n.translate(
        'xpack.securitySolution.entityIntelligence.policies.template.tool.name',
        { defaultMessage: 'Restricted tool use' }
      ),
      activityType: 'restricted_tool_use',
      toolNames: ['platform.core.execute_esql'],
      inputContains: '',
      providers: ['agent_builder'],
    },
  },
];

export const parseToolNames = (value: string): string[] => [
  ...new Set(
    value
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
  ),
];

export const validatePolicy = (input: AiPolicyInput): string[] => {
  const errors: string[] = [];
  if (!input.name.trim())
    errors.push(
      i18n.translate('xpack.securitySolution.entityIntelligence.policies.validation.name', {
        defaultMessage: 'Enter a policy name.',
      })
    );
  if (!input.providers.length)
    errors.push(
      i18n.translate('xpack.securitySolution.entityIntelligence.policies.validation.providers', {
        defaultMessage: 'Select at least one agent source.',
      })
    );
  if (!input.toolNames.length && !input.inputContains.trim())
    errors.push(
      i18n.translate('xpack.securitySolution.entityIntelligence.policies.validation.condition', {
        defaultMessage: 'Add a tool name or text to match in the tool input.',
      })
    );
  if (input.toolNames.length > 20 || input.toolNames.some((name) => name.length > 200))
    errors.push(
      i18n.translate('xpack.securitySolution.entityIntelligence.policies.validation.tools', {
        defaultMessage: 'Use at most 20 tool names, with up to 200 characters each.',
      })
    );
  return errors;
};

/** Previews only the literal matching conditions, without recording an event or finding. */
export const previewPolicyMatch = (
  policy: AiPolicyInput,
  provider: AiPolicyProvider,
  toolName: string,
  input: string
): boolean =>
  validatePolicy(policy).length === 0 &&
  policy.providers.includes(provider) &&
  (policy.toolNames.length === 0 || policy.toolNames.includes(toolName)) &&
  (policy.inputContains.length === 0 ||
    input.toLowerCase().includes(policy.inputContains.toLowerCase()));
