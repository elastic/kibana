/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify } from 'yaml';
import type { NightshiftAutomationAttributes, NightshiftTriggerRow } from './types';

/**
 * Generates a workflow YAML document from a nightshift automation config.
 *
 * Uses the yaml package to serialize all user-provided strings so that special
 * characters (newlines, colons, quotes) in prompt templates never corrupt the document.
 *
 * Alert-trigger support uses alerting.alertStatusChanged (#291886). The code is complete
 * and ready — it activates the moment #291886 lands with no follow-up change needed here.
 *
 * Dispatch budget gating (nightshift.checkBudget step) is added in a follow-up PR that
 * covers both per-automation daily limits and the global Nightshift cap together.
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
    triggers: buildTriggers(automation.trigger.rows),
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

function buildTriggers(rows: NightshiftAutomationAttributes['trigger']['rows']): unknown[] {
  const alertRows = rows.filter(
    (r): r is Extract<NightshiftTriggerRow, { kind: 'alert' }> => r.kind === 'alert'
  );

  if (alertRows.length > 0) {
    // alerting.alertStatusChanged lands via elastic/kibana#291886.
    // Until that merges, the alert-trigger branch cannot fire, but the YAML is structurally valid.
    const statuses = deriveStatuses(alertRows);
    return [
      {
        type: 'alerting.alertStatusChanged',
        with: {
          ...(statuses.length > 0 ? { statuses } : {}),
        },
      },
    ];
  }

  // Fallback: manual trigger for schedule-kind rows (future PR) or no alert rows.
  return [{ type: 'manual' }];
}

function deriveStatuses(
  rows: Array<Extract<NightshiftTriggerRow, { kind: 'alert' }>>
): string[] {
  const statusSet = new Set<string>();
  for (const row of rows) {
    const s = row.alertStatus ?? 'any';
    if (s === 'any') {
      return [];
    }
    if (s === 'active') statusSet.add('active');
    if (s === 'inactive') statusSet.add('inactive');
  }
  return [...statusSet];
}
