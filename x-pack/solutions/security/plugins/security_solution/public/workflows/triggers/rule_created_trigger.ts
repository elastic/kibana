/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { PublicTriggerDefinition } from '@kbn/workflows-extensions/public';
import React from 'react';
import {
  SECURITY_RULE_CREATED_TRIGGER_ID,
  commonSecurityRuleCreatedTriggerDefinition,
} from '../../../common/workflows/triggers';

export const securityRuleCreatedPublicDefinition: PublicTriggerDefinition = {
  ...commonSecurityRuleCreatedTriggerDefinition,
  title: i18n.translate('xpack.securitySolution.workflows.ruleCreatedTrigger.title', {
    defaultMessage: 'Security rule created',
  }),
  description: i18n.translate('xpack.securitySolution.workflows.ruleCreatedTrigger.description', {
    defaultMessage:
      'Emitted when a new detection rule is created. Includes rule name, type, severity, and risk score.',
  }),
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/security_signal').then(({ icon }) => ({
      default: icon,
    }))
  ),
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.ruleCreatedTrigger.documentation.details',
      {
        defaultMessage:
          'Emitted after a detection rule is created via the API. Use event properties to filter by rule type, severity, or whether the rule is enabled.',
      }
    ),
    examples: [
      i18n.translate(
        'xpack.securitySolution.workflows.ruleCreatedTrigger.documentation.exampleAny',
        {
          defaultMessage: `## Run on any new rule\n\`\`\`yaml\ntriggers:\n  - type: {triggerId}\n\`\`\``,
          values: { triggerId: SECURITY_RULE_CREATED_TRIGGER_ID },
        }
      ),
      i18n.translate(
        'xpack.securitySolution.workflows.ruleCreatedTrigger.documentation.exampleHighSeverity',
        {
          defaultMessage: `## Only high/critical severity rules\n\`\`\`yaml\ntriggers:\n  - type: {triggerId}\n    on:\n      condition: 'event.severity: "high" OR event.severity: "critical"'\n\`\`\``,
          values: { triggerId: SECURITY_RULE_CREATED_TRIGGER_ID },
        }
      ),
    ],
  },
  snippets: {
    condition: 'event.severity: "high"',
  },
};
