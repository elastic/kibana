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
  SECURITY_ALERTS_CREATED_TRIGGER_ID,
  commonSecurityAlertsCreatedTriggerDefinition,
} from '../../../common/workflows/triggers';

export const securityAlertsCreatedPublicDefinition: PublicTriggerDefinition = {
  ...commonSecurityAlertsCreatedTriggerDefinition,
  title: i18n.translate('xpack.securitySolution.workflows.alertsCreatedTrigger.title', {
    defaultMessage: 'Security alerts created',
  }),
  description: i18n.translate('xpack.securitySolution.workflows.alertsCreatedTrigger.description', {
    defaultMessage:
      'Emitted when a detection rule creates new alerts. Includes rule metadata and alert counts.',
  }),
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/security_signal_detected').then(({ icon }) => ({
      default: icon,
    }))
  ),
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.alertsCreatedTrigger.documentation.details',
      {
        defaultMessage:
          'Emitted after a security detection rule execution that produced new alerts. Use event properties to filter by rule type, rule name, or alert count thresholds.',
      }
    ),
    examples: [
      i18n.translate(
        'xpack.securitySolution.workflows.alertsCreatedTrigger.documentation.exampleAny',
        {
          defaultMessage: `## Run on any new alerts\n\`\`\`yaml\ntriggers:\n  - type: {triggerId}\n\`\`\``,
          values: { triggerId: SECURITY_ALERTS_CREATED_TRIGGER_ID },
        }
      ),
      i18n.translate(
        'xpack.securitySolution.workflows.alertsCreatedTrigger.documentation.exampleRuleType',
        {
          defaultMessage: `## Filter by rule type\n\`\`\`yaml\ntriggers:\n  - type: {triggerId}\n    on:\n      condition: 'event.rule_type: "siem.eqlRule"'\n\`\`\``,
          values: { triggerId: SECURITY_ALERTS_CREATED_TRIGGER_ID },
        }
      ),
      i18n.translate(
        'xpack.securitySolution.workflows.alertsCreatedTrigger.documentation.exampleHighVolume',
        {
          defaultMessage: `## Only when many alerts are created\n\`\`\`yaml\ntriggers:\n  - type: {triggerId}\n    on:\n      condition: 'event.alerts_count >= 10'\n\`\`\``,
          values: { triggerId: SECURITY_ALERTS_CREATED_TRIGGER_ID },
        }
      ),
    ],
  },
  snippets: {
    condition: 'event.alerts_count >= 1',
  },
};
