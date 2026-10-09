/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify } from 'yaml';
import type { InvestigationNotificationDestination } from '../../../common';
import type { NightshiftAutomationAttributes, NightshiftTriggerRow, OverlapPolicy } from './types';

type SlackTriggerRow = Extract<NightshiftTriggerRow, { kind: 'slack' }>;

const SLACK_THREAD_INVESTIGATION_PATH =
  '/s/{{ workflow.spaceId }}/internal/nightshift/investigations/_slack_thread';
const DEFAULT_SLACK_PROMPT = 'A message was posted in Slack:\n\n{{ event.text }}';

// alerting.alertStatusChanged uses 'active'/'recovered'; our AlertStatus uses 'active'/'inactive'.
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
  const alertRows = automation.trigger.rows.filter(
    (r): r is Extract<NightshiftTriggerRow, { kind: 'alert' }> => r.kind === 'alert'
  );
  const isAlertTrigger = alertRows.length > 0;

  const strategy = automation.runtime.overlapPolicy
    ? OVERLAP_POLICY_TO_STRATEGY[automation.runtime.overlapPolicy]
    : 'drop';
  const notificationDestinations = buildNotificationDestinations(automationId, automation);

  const slackRows = automation.trigger.rows.filter((r): r is SlackTriggerRow => r.kind === 'slack');
  const isSlackTrigger = !isAlertTrigger && slackRows.length > 0;

  const workflowObj: Record<string, unknown> = {
    name: automation.name,
    enabled: automation.isEnabled,
    tags: ['nightshift', 'automation'],
    settings: {
      concurrency: {
        // Per message, so one thread does not block another.
        key: isSlackTrigger
          ? `${automationId}-{{ event.channel }}-{{ event.messageId }}`
          : automationId,
        strategy,
        max: 1,
      },
    },
    triggers: isSlackTrigger ? buildSlackTriggers(slackRows) : buildTriggers(alertRows),
    steps: isSlackTrigger
      ? buildSlackSteps(automation)
      : [
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
              ...(notificationDestinations ? { notificationDestinations } : {}),
            },
          },
        ],
  };

  return stringify(workflowObj, { lineWidth: 0 });
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
  const { completion } = automation;
  if (
    completion.action !== 'post_to_slack' ||
    completion.targetMode !== 'channel' ||
    !completion.destination
  ) {
    return undefined;
  }
  return [
    {
      type: 'slack',
      connector_id: completion.connectorId ?? ELASTIC_APPS_SLACK_CONNECTOR_ID,
      params: { channel: completion.destination },
      automation_id: automationId,
      automation_name: automation.name,
    },
  ];
}

const buildSlackTriggers = (slackRows: SlackTriggerRow[]): unknown[] => [
  {
    type: 'slack2.message',
    'connector-id': ELASTIC_APPS_SLACK_CONNECTOR_ID,
    on: { condition: buildSlackCondition(slackRows) },
  },
];

/**
 * One investigation per top-level message, keyed to its thread. Replies are handled by the managed
 * `system-nightshift-slack-thread` workflow.
 */
const buildSlackSteps = (automation: NightshiftAutomationAttributes): unknown[] => [
  {
    name: 'find_or_create_investigation',
    type: 'kibana.request',
    with: {
      method: 'POST',
      path: SLACK_THREAD_INVESTIGATION_PATH,
      headers: { 'x-elastic-internal-origin': 'kibana' },
      body: {
        workspace: '${{ event.workspace }}',
        channel: '{{ event.channel }}',
        thread_ts: '{{ event.messageId }}',
        text: '${{ event.text }}',
        create: true,
        // The thread records each event, so a redelivery comes back with `duplicate: true`.
        event_id: '${{ event.correlationKey }}',
        execution_id: '{{ execution.id }}',
      },
    },
  },
  {
    name: 'investigate',
    type: 'workflow.execute',
    if: '${{ steps.find_or_create_investigation.output.duplicate != true }}',
    with: {
      'workflow-id': 'system-nightshift-investigation',
      inputs: {
        title: '{{ steps.find_or_create_investigation.output.title }}',
        message: automation.execution.promptTemplate ?? DEFAULT_SLACK_PROMPT,
        investigation_id: '{{ steps.find_or_create_investigation.output.investigation_id }}',
      },
    },
  },
];

function buildSlackCondition(rows: SlackTriggerRow[]): string {
  const rowConditions = rows.map(buildSlackRowCondition);
  if (rowConditions.length === 1) return rowConditions[0];
  return rowConditions.map((c) => `(${c})`).join(' or ');
}

function buildSlackRowCondition(row: SlackTriggerRow): string {
  const parts = [
    'event.workspace:*',
    'not event.threadId:*',
    '(not event.subtype:* or event.subtype:bot_message or event.subtype:file_share)',
  ];

  if (row.channels && row.channels.length > 0) {
    parts.push(anyOf('event.channel', row.channels));
  }

  if (row.users && row.users.length > 0) {
    parts.push(anyOf('event.sender', row.users));
  }

  const messageFilter = row.messageFilter?.trim();
  if (messageFilter) {
    // Unquoted, since a quoted `*` is literal in KQL and would only match the exact text.
    parts.push(`event.text: *${escapeKqlWildcardTerm(messageFilter)}*`);
  }

  return parts.join(' and ');
}

function escapeKqlWildcardTerm(value: string): string {
  return value.replace(/[\\():<>"*{}]/g, '\\$&').replace(/\b(or|and|not)\b/gi, '\\$1');
}

function anyOf(field: string, values: string[]): string {
  const clauses = values.map((value) => `${field}: "${escapeKql(value)}"`);
  return clauses.length === 1 ? clauses[0] : `(${clauses.join(' or ')})`;
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
