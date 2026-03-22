/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { PublicTriggerDefinition } from '@kbn/workflows-extensions/public';
import {
  HIGH_RISK_ALERT_INDEXED_TRIGGER_ID,
  commonHighRiskAlertIndexedTrigger,
} from '../../../common/workflows/triggers/high_risk_alert_indexed';

/**
 * Public-side trigger definition for high-risk alert indexed event.
 * Provides UI metadata for the Workflows app.
 */
export const highRiskAlertIndexedPublicDefinition: PublicTriggerDefinition = {
  ...commonHighRiskAlertIndexedTrigger,

  title: i18n.translate('xpack.securitySolution.workflows.highRiskAlert.title', {
    defaultMessage: 'High-risk alert indexed',
  }),

  description: i18n.translate('xpack.securitySolution.workflows.highRiskAlert.description', {
    defaultMessage:
      'Triggered when a high-risk security alert (risk_score >= 50) is successfully indexed. ' +
      'Use to trigger MITRE mapping, enrichment, auto-triage, or investigation workflows.',
  }),

  icon: React.lazy(() =>
    import('@elastic/eui').then((module) => ({
      default: () => <module.EuiIcon type="alert" color="danger" />,
    }))
  ),

  documentation: {
    summary: 'Event-driven trigger for high-risk security alerts',

    details: `Emitted automatically when a security alert with risk_score >= 50 is indexed to Elasticsearch.

**Event payload includes:**
- alertId: Document ID
- riskScore: Risk score (50-100)
- index: Elasticsearch index
- spaceId: Kibana space
- hasRuleMitreTags: Whether rule has MITRE tags
- alertTimestamp: When alert occurred

**Use cases:**
- MITRE ATT&CK auto-mapping
- Auto-triage workflows
- Case creation for critical alerts
- Slack notifications
- Enrichment pipelines

**Filter workflows using KQL conditions** on event properties.`,

    examples: [
      `## Trigger on all high-risk alerts
\`\`\`yaml
triggers:
  - type: ${HIGH_RISK_ALERT_INDEXED_TRIGGER_ID}
\`\`\``,

      `## Only alerts without rule MITRE tags (gap-filling)
\`\`\`yaml
triggers:
  - type: ${HIGH_RISK_ALERT_INDEXED_TRIGGER_ID}
    on:
      condition: 'event.hasRuleMitreTags: false'
\`\`\``,

      `## Only critical alerts (risk >= 75)
\`\`\`yaml
triggers:
  - type: ${HIGH_RISK_ALERT_INDEXED_TRIGGER_ID}
    on:
      condition: 'event.riskScore >= 75'
\`\`\``,

      `## Specific space only
\`\`\`yaml
triggers:
  - type: ${HIGH_RISK_ALERT_INDEXED_TRIGGER_ID}
    on:
      condition: 'event.spaceId: "production"'
\`\`\``,
    ],
  },

  snippets: {
    condition: 'event.riskScore >= 75', // Example condition snippet
  },
};
