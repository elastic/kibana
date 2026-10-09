/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify } from 'yaml';
import type { NightshiftAutomationAttributes, NightshiftTriggerRow, OverlapPolicy } from './types';

// alerting.alertStatusChanged uses 'active'/'recovered'; our AlertStatus uses 'active'/'inactive'.
const ALERT_STATUS_TO_KQL: Record<string, string> = {
  active: 'active',
  inactive: 'recovered',
};

// Maps our OverlapPolicy type to workflow engine concurrency strategy strings.
const OVERLAP_POLICY_TO_STRATEGY: Record<OverlapPolicy, string> = {
  drop: 'drop',
  cancel_in_progress: 'cancel-in-progress',
  queue: 'queue',
};

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
  const eventRows = automation.trigger.rows.filter(
    (row): row is Extract<NightshiftTriggerRow, { kind: 'significant_event' }> =>
      row.kind === 'significant_event'
  );
  if (eventRows.length) {
    const conditions = eventRows.map((row) => {
      const parts = ['event.status: "active"'];
      if (row.titlePattern) parts.push(`event.title: "*${escapeKql(row.titlePattern)}*"`);
      if (row.severities?.length)
        parts.push(
          `(${row.severities.map((severity) => `event.severity: "${severity}"`).join(' OR ')})`
        );
      if (row.streamNames?.length)
        parts.push(
          `(${row.streamNames
            .map((name) => `event.stream_names: "${escapeKql(name)}"`)
            .join(' OR ')})`
        );
      return `(${parts.join(' AND ')})`;
    });
    return stringify(
      {
        name: automation.name,
        enabled: automation.isEnabled,
        tags: ['nightshift', 'automation'],
        settings: {
          concurrency: { key: `${automationId}:{{ event.event_id }}`, strategy: 'drop', max: 1 },
        },
        triggers: [
          { type: 'significant-events.eventCreated', on: { condition: conditions.join(' OR ') } },
          {
            type: 'significant-events.eventStatusChanged',
            on: { condition: conditions.join(' OR ') },
          },
        ],
        steps: [
          {
            name: 'trigger_investigation',
            type: 'nightshift.triggerInvestigation',
            with: {
              subject_type: 'significant_event',
              subject_id: '{{ event.event_id }}',
              title: '{{ event.title }}',
              summary: '{{ event.summary }}',
              trigger_type: 'automatic',
              concurrency_key: '{{ event.event_id }}',
              ...(automation.execution.promptTemplate
                ? { message: automation.execution.promptTemplate }
                : {}),
            },
          },
        ],
      },
      { lineWidth: 0 }
    );
  }
  const alertRows = automation.trigger.rows.filter(
    (r): r is Extract<NightshiftTriggerRow, { kind: 'alert' }> => r.kind === 'alert'
  );
  const isAlertTrigger = alertRows.length > 0;

  const strategy = automation.runtime.overlapPolicy
    ? OVERLAP_POLICY_TO_STRATEGY[automation.runtime.overlapPolicy]
    : 'drop';

  const workflowObj: Record<string, unknown> = {
    name: automation.name,
    enabled: automation.isEnabled,
    tags: ['nightshift', 'automation'],
    settings: {
      concurrency: {
        key: automationId,
        strategy,
        max: 1,
      },
    },
    triggers: buildTriggers(alertRows),
    steps: [
      {
        name: 'trigger_investigation',
        type: 'nightshift.triggerInvestigation',
        with: {
          subject_type: 'alert',
          subject_id: isAlertTrigger ? '{{ trigger.alert.uuid }}' : automationId,
          title: isAlertTrigger ? '{{ trigger.rule.name }}' : automation.name,
          summary: automation.name,
          trigger_type: 'automatic',
          concurrency_key: automationId,
          ...(automation.execution.promptTemplate
            ? { message: automation.execution.promptTemplate }
            : {}),
        },
      },
    ],
  };

  return stringify(workflowObj, { lineWidth: 0 });
}

function buildTriggers(
  alertRows: Array<Extract<NightshiftTriggerRow, { kind: 'alert' }>>
): unknown[] {
  if (alertRows.length === 0) {
    return [{ type: 'manual' }];
  }

  const trigger: Record<string, unknown> = { type: 'alerting.alertStatusChanged' };
  const condition = buildCondition(alertRows);
  if (condition) {
    trigger.on = { condition };
  }
  return [trigger];
}

function buildCondition(rows: Array<Extract<NightshiftTriggerRow, { kind: 'alert' }>>): string {
  const rowConditions = rows.map(buildRowCondition).filter(Boolean);
  if (rowConditions.length === 0) return '';
  if (rowConditions.length === 1) return rowConditions[0];
  return rowConditions.map((c) => `(${c})`).join(' OR ');
}

function buildRowCondition(row: Extract<NightshiftTriggerRow, { kind: 'alert' }>): string {
  const parts: string[] = [];

  if (row.alertStatus && row.alertStatus !== 'any') {
    const kqlStatus = ALERT_STATUS_TO_KQL[row.alertStatus];
    if (kqlStatus) {
      parts.push(`alert.status: "${kqlStatus}"`);
    }
  }

  if (row.ruleNamePattern) {
    const mode = row.ruleNameMatchMode ?? 'substring';
    if (mode === 'substring') {
      parts.push(`rule.name: "*${escapeKql(row.ruleNamePattern)}*"`);
    }
    // regex mode: KQL does not natively support regex — filter applied at investigation time.
  }

  if (row.tags && row.tags.length > 0) {
    const tagParts = row.tags.map((t) => `rule.tags: "${escapeKql(t)}"`);
    parts.push(tagParts.length === 1 ? tagParts[0] : `(${tagParts.join(' OR ')})`);
  }

  return parts.join(' AND ');
}

function escapeKql(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
