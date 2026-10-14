/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify } from 'yaml';
import { DEFAULT_MANUAL_INVESTIGATION_SUBJECT_ID } from '../../../common';
import type { InvestigationNotificationDestination } from '../../../common';
import { parsePresetSchedule } from '../../../common/automation_schedule';
import type { NightshiftAutomationAttributes, NightshiftTriggerRow, OverlapPolicy } from './types';

// alerting.v1.alertStatusChanged uses 'active'/'recovered'; our AlertStatus uses 'active'/'inactive'.
const ALERT_STATUS_TO_KQL: Record<string, string> = {
  active: 'active',
  inactive: 'recovered',
};

// Defaults to the Elastic Slack app when no connector is selected; the channel remains user-selected.
// Mirrors significant_events/server/lib/slack_app/service.ts, which depends on this plugin.
const ELASTIC_APPS_SLACK_CONNECTOR_ID = 'elastic-apps-slack';

// Maps our OverlapPolicy type to workflow engine concurrency strategy strings.
const OVERLAP_POLICY_TO_STRATEGY: Record<OverlapPolicy, string> = {
  drop: 'drop',
  cancel_in_progress: 'cancel-in-progress',
  queue: 'queue',
};

/** Generates a workflow document from an automation, serializing user input safely. */
export function generateWorkflowYaml(
  automationId: string,
  automation: NightshiftAutomationAttributes
): string {
  const alertRows = automation.trigger.rows.filter(
    (r): r is Extract<NightshiftTriggerRow, { kind: 'alert' }> => r.kind === 'alert'
  );
  const schedule = automation.trigger.rows.find((row) => row.kind === 'schedule');
  const alertWorkflow =
    alertRows.length > 0 || !schedule
      ? generateAlertWorkflow(automationId, automation, alertRows, Boolean(schedule))
      : undefined;
  const scheduledWorkflow = schedule
    ? generateScheduledWorkflow(automationId, automation, schedule, alertRows.length > 0)
    : undefined;

  const strategy = automation.runtime.overlapPolicy
    ? OVERLAP_POLICY_TO_STRATEGY[automation.runtime.overlapPolicy]
    : 'drop';

  const workflowObj = {
    name: automation.name,
    enabled: automation.isEnabled,
    tags: ['nightshift', 'automation'],
    settings: {
      ...(automation.runtime.timeoutSeconds !== undefined
        ? { timeout: `${automation.runtime.timeoutSeconds}s` }
        : {}),
      concurrency: { key: automationId, strategy, max: 1 },
    },
    triggers: [...(alertWorkflow?.triggers ?? []), ...(scheduledWorkflow?.triggers ?? [])],
    steps: [...(scheduledWorkflow?.steps ?? []), ...(alertWorkflow?.steps ?? [])],
  };

  return stringify(workflowObj, { lineWidth: 0 });
}

function generateAlertWorkflow(
  automationId: string,
  automation: NightshiftAutomationAttributes,
  alertRows: Array<Extract<NightshiftTriggerRow, { kind: 'alert' }>>,
  hasScheduledTrigger: boolean
) {
  const condition = buildCondition(alertRows);
  const notificationDestinations = buildNotificationDestinations(automationId, automation);

  return {
    triggers: [
      alertRows.length > 0
        ? {
            type: 'alerting.v1.alertStatusChanged',
            ...(condition ? { on: { condition } } : {}),
          }
        : { type: 'manual' },
    ],
    steps: [
      {
        name: hasScheduledTrigger ? 'trigger_alert_investigation' : 'trigger_investigation',
        type: 'nightshift.triggerInvestigation',
        ...(hasScheduledTrigger
          ? { if: 'execution.triggeredBy: "alerting.v1.alertStatusChanged"' }
          : {}),
        with: {
          subject_type: 'alert',
          subject_id: alertRows.length > 0 ? '{{ trigger.alert.uuid }}' : automationId,
          title: alertRows.length > 0 ? '{{ trigger.rule.name }}' : automation.name,
          summary: automation.name,
          trigger_type: 'automatic',
          ...(automation.execution.promptTemplate
            ? { message: automation.execution.promptTemplate }
            : {}),
          ...(automation.runtime.timeoutSeconds !== undefined
            ? { timeout_seconds: automation.runtime.timeoutSeconds }
            : {}),
          ...(notificationDestinations ? { notificationDestinations } : {}),
        },
      },
    ],
  };
}

function generateScheduledWorkflow(
  automationId: string,
  automation: NightshiftAutomationAttributes,
  schedule: Extract<NightshiftTriggerRow, { kind: 'schedule' }>,
  hasAlertTrigger: boolean
) {
  const parsed = parsePresetSchedule(schedule);
  if (!parsed.success) throw new Error(parsed.error);
  const notificationDestinations = buildNotificationDestinations(automationId, automation);

  return {
    triggers: [parsed.trigger],
    steps: [
      {
        name: 'trigger_investigation',
        type: 'nightshift.triggerInvestigation',
        ...(hasAlertTrigger ? { if: 'execution.triggeredBy: "scheduled"' } : {}),
        with: {
          subject_type: 'manual',
          subject_id: DEFAULT_MANUAL_INVESTIGATION_SUBJECT_ID,
          title: automation.name,
          summary: automation.name,
          trigger_type: 'automatic',
          ...(automation.execution.promptTemplate
            ? { message: automation.execution.promptTemplate }
            : {}),
          ...(schedule.scopeQuery ? { scope_query: schedule.scopeQuery } : {}),
          ...(automation.runtime.timeoutSeconds !== undefined
            ? { timeout_seconds: automation.runtime.timeoutSeconds }
            : {}),
          ...(notificationDestinations ? { notificationDestinations } : {}),
        },
      },
    ],
  };
}

/**
 * The Slack destination the investigation posts its outcome to, copied onto the run so delivery
 * needs no automation lookup. Only `channel` mode is emitted: `thread` mode needs the triggering
 * Slack message (`event.channel`, `event.threadId | default: event.messageId`, `event.connectorId`),
 * which no current trigger row provides; rendering those on an alert trigger would produce empty
 * strings and the investigation step would reject the run.
 */
function buildNotificationDestinations(
  automationId: string,
  automation: NightshiftAutomationAttributes
): InvestigationNotificationDestination[] | undefined {
  const destinations: InvestigationNotificationDestination[] = [];
  for (const completion of automation.completions) {
    if (
      completion.action !== 'post_to_slack' ||
      completion.targetMode !== 'channel' ||
      !completion.destination
    ) {
      continue;
    }
    destinations.push({
      type: 'slack',
      connector_id: completion.connectorId ?? ELASTIC_APPS_SLACK_CONNECTOR_ID,
      params: { channel: completion.destination },
      automation_id: automationId,
      automation_name: automation.name,
    });
  }
  return destinations.length > 0 ? destinations : undefined;
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

  const ruleMatchers = [
    ...(row.ruleNames ?? []).map((name) => `rule.name: "${escapeKql(name)}"`),
    ...(row.tags ?? []).map((tag) => `rule.tags: "${escapeKql(tag)}"`),
  ];
  if (ruleMatchers.length > 0) {
    parts.push(ruleMatchers.length === 1 ? ruleMatchers[0] : `(${ruleMatchers.join(' OR ')})`);
  }

  return parts.join(' AND ');
}

function escapeKql(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
