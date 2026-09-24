/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify } from 'yaml';
import type { NightshiftAutomationAttributes } from './types';

/**
 * Generates a workflow YAML document from a nightshift automation config.
 *
 * Uses the yaml package to serialize all user-provided strings so that special
 * characters (newlines, colons, quotes) in prompt templates never corrupt the document.
 *
 * Alert-trigger support (alerting.alertStatusChanged) is added in a follow-up PR.
 * Until then all automations use a manual trigger placeholder so the workflow is
 * always structurally valid and the SO + workflow pair can be created and tested.
 */
export function generateWorkflowYaml(
  automationId: string,
  automation: NightshiftAutomationAttributes
): string {
  const workflowObj: Record<string, unknown> = {
    name: automation.name,
    enabled: automation.isEnabled,
    tags: ['nightshift', 'automation'],
    settings: {
      concurrency: {
        key: '{{ execution.id }}',
        strategy: 'drop',
        max: 1,
      },
    },
    triggers: [{ type: 'manual' }],
    steps: [
      {
        name: 'trigger_investigation',
        type: 'nightshift.triggerInvestigation',
        with: {
          subject_type: 'alert',
          subject_id: '{{ execution.id }}',
          summary: automation.name,
          trigger_type: 'automatic',
          concurrency_key: '{{ execution.id }}',
          ...(automation.execution.promptTemplate
            ? { message: automation.execution.promptTemplate }
            : {}),
        },
      },
    ],
  };

  return stringify(workflowObj, { lineWidth: 0 });
}
