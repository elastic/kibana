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
 * Alert-trigger support uses alerting.alertStatusChanged (#291886). Until that PR lands the
 * branch is unreachable in production, but the code is complete so merging #291886 activates it
 * with no follow-up change needed here.
 */
export function generateWorkflowYaml(
  automationId: string,
  automation: NightshiftAutomationAttributes
): string {
  const triggers = buildTriggers(automation.trigger.rows);
  const dailyLimit = automation.runtime.dailyDispatchLimit ?? 0;

  const steps: Array<Record<string, unknown>> = [];

  steps.push({
    name: 'check_budget',
    type: 'nightshift.checkBudget',
    with: {
      automation_id: automationId,
      ...(dailyLimit > 0 ? { daily_limit: dailyLimit } : {}),
    },
  });

  steps.push({
    name: 'trigger_investigation',
    type: 'nightshift.triggerInvestigation',
    if: '{{ steps.check_budget.output.allowed }}',
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
  });

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
    triggers,
    steps,
  };

  return stringify(workflowObj, { lineWidth: 0 });
}

function buildTriggers(rows: NightshiftAutomationAttributes['trigger']['rows']): unknown[] {
  const alertRows = rows.filter((r): r is Extract<NightshiftTriggerRow, { kind: 'alert' }> =>
    r.kind === 'alert'
  );

  if (alertRows.length > 0) {
    // alerting.alertStatusChanged lands via elastic/kibana#291886.
    // Until that merges, the alert-trigger branch cannot fire, but the YAML is structurally valid.
    const statuses = deriveStatuses(alertRows);
    return [
      {
        type: 'alerting.alertStatusChanged',
        with: {
          ...(statuses.length > 0 && statuses.length < 2 ? { statuses } : {}),
        },
      },
    ];
  }

  // Fallback: manual trigger keeps the workflow structurally valid for automations that only have
  // schedule-kind rows (schedule triggers are a future PR) or no rows at all.
  return [{ type: 'manual' }];
}

function deriveStatuses(
  rows: Array<Extract<NightshiftTriggerRow, { kind: 'alert' }>>
): string[] {
  const statusSet = new Set<string>();
  for (const row of rows) {
    const s = row.alertStatus ?? 'any';
    if (s === 'any') {
      // 'any' means both states → don't restrict to either
      return [];
    }
    // Map our internal status names to the values alerting.alertStatusChanged uses
    if (s === 'active') statusSet.add('active');
    if (s === 'inactive') statusSet.add('inactive');
  }
  return [...statusSet];
}
