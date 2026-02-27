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
  alertId: z.string().describe('The alert ID'),
  alertIndex: z.string().describe('The index that contains the alert'),
});

const outputSchema = z.object({
  alert_id: z.string(),
  alert_index: z.string(),
  timeline_string: z.string().describe('A Timeline-like English string for the alert'),
  message: z.string(),
});

export const renderAlertNarrativeStepDefinition: PublicStepDefinition = {
  id: 'security.renderAlertNarrative',
  inputSchema,
  outputSchema,
  label: i18n.translate('xpack.securitySolution.workflows.steps.renderAlertNarrative.label', {
    defaultMessage: 'Render Alert Narrative',
  }),
  description: i18n.translate(
    'xpack.securitySolution.workflows.steps.renderAlertNarrative.description',
    {
      defaultMessage:
        'Render a human-readable narrative string for an alert based on its event, process, network, and host fields',
    }
  ),
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/timeslider')
      .then(({ icon }) => ({ default: icon }))
      .catch(() =>
        import('@elastic/eui/es/components/icon/assets/documents').then(({ icon }) => ({
          default: icon,
        }))
      )
  ),
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.renderAlertNarrative.documentation.details',
      {
        defaultMessage:
          'Fetches the alert from Elasticsearch and renders a plain-English narrative string that summarizes the event and (when present) associated process context. The output is designed for use in workflows (e.g., notes, summaries, LLM prompts).',
      }
    ),
    examples: [
      `## Render an alert narrative
\`\`\`yaml
- name: render_alert_narrative
  type: security.renderAlertNarrative
  with:
    alertId: "{{ variables.alert_id }}"
    alertIndex: "{{ variables.alert_index }}"
\`\`\``,
    ],
  },
};
