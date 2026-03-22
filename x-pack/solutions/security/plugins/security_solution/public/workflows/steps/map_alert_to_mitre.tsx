/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { commonMapAlertToMitreStepDefinition } from '../../../common/workflows/steps/map_alert_to_mitre';

/**
 * Public-side workflow step definition for MITRE ATT&CK auto-mapping.
 * Provides UI metadata for the Workflows app.
 */
export const mapAlertToMitrePublicStepDefinition: PublicStepDefinition = {
  ...commonMapAlertToMitreStepDefinition,

  label: i18n.translate('xpack.securitySolution.workflows.mapAlertToMitre.label', {
    defaultMessage: 'Map alert to MITRE ATT&CK',
  }),

  description: i18n.translate('xpack.securitySolution.workflows.mapAlertToMitre.description', {
    defaultMessage:
      'Automatically enriches a security alert with MITRE ATT&CK technique and tactic tags using LLM reasoning. Includes 90% caching for cost optimization.',
  }),

  icon: React.lazy(() =>
    import('@elastic/eui').then((module) => ({
      default: () => <module.EuiIcon type="logoSecurity" />,
    }))
  ),

  documentation: {
    summary:
      'Enriches security alerts with MITRE ATT&CK framework tags using Claude Haiku LLM',

    details: `This step analyzes alert content (process execution, network activity, file operations, registry modifications) and automatically attributes MITRE ATT&CK techniques.

**Features:**
- Hybrid approach: Fills gaps for untagged rules, extends tagged rules with additional techniques
- 90% cache hit rate (reduces cost and latency)
- ECS-compliant threat.* fields
- Graceful degradation (returns success:false if mapping fails)

**Performance:**
- Cache hit: <100ms
- Cache miss: 200-500ms (LLM call)

**Cost:**
- ~$120/month for 1M alerts (with caching + risk score filter)`,

    examples: [
      `## Basic usage (trigger context)
\`\`\`yaml
triggers:
  - type: security-solution.highRiskAlertIndexed
steps:
  - name: map_mitre
    type: security-solution.mapAlertToMitre
    with:
      alertId: "{{ context.event.alertId }}"
      index: "{{ context.event.index }}"
\`\`\``,

      `## Only map alerts without rule tags (gap-filling)
\`\`\`yaml
triggers:
  - type: security-solution.highRiskAlertIndexed
    on:
      condition: 'event.hasRuleMitreTags: false'
steps:
  - name: map_mitre
    type: security-solution.mapAlertToMitre
    with:
      alertId: "{{ context.event.alertId }}"
      index: "{{ context.event.index }}"
\`\`\``,

      `## Conditional logging based on success
\`\`\`yaml
steps:
  - name: map_mitre
    type: security-solution.mapAlertToMitre
    with:
      alertId: "{{ context.event.alertId }}"
      index: "{{ context.event.index }}"

  - name: log_success
    type: console.log
    when: "{{ steps.map_mitre.output.success }}"
    with:
      message: "MITRE mapped: {{ steps.map_mitre.output.techniqueIds }}"
\`\`\``,
    ],
  },
};
