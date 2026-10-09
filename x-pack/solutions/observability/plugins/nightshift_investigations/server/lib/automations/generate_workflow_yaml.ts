/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify } from 'yaml';
import type { InvestigationNotificationDestination } from '../../../common';
import type { NightshiftAutomationAttributes, NightshiftTriggerRow, OverlapPolicy } from './types';

// alerting.alertStatusChanged uses 'active'/'recovered'; our AlertStatus uses 'active'/'inactive'.
const ALERT_STATUS_TO_KQL: Record<string, string> = {
  active: 'active',
  inactive: 'recovered',
};

// Defaults to the Elastic Slack app when no connector is selected; the channel remains user-selected.
// Mirrors significant_events/server/lib/slack_app/service.ts, which depends on this plugin.
const ELASTIC_APPS_SLACK_CONNECTOR_ID = 'elastic-apps-slack';

const ALERT_TRIGGER_TYPE = 'alerting.alertStatusChanged';
const SLACK_MESSAGE_TRIGGER_TYPE = 'slack2.message';

// One investigation per message, so concurrent messages in a channel do not share a subject.
const SLACK_SUBJECT_ID = '{{ event.connectorId }}:{{ event.channel }}:{{ event.messageId }}';

const SLACK_MESSAGE_PROMPT =
  'Slack message from {{ event.sender }} in channel {{ event.channel }}:\n\n{{ event.text | truncate: 4000 }}';

type AlertRow = Extract<NightshiftTriggerRow, { kind: 'alert' }>;
type SlackRow = Extract<NightshiftTriggerRow, { kind: 'slack' }>;

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
  const slackRows = automation.trigger.rows.filter(isSlackRow);

  const strategy = automation.runtime.overlapPolicy
    ? OVERLAP_POLICY_TO_STRATEGY[automation.runtime.overlapPolicy]
    : 'drop';
  const notificationDestinations = buildNotificationDestinations(automationId, automation);

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
    triggers: buildTriggers(alertRows, slackRows),
    steps: buildSteps(alertRows.length > 0, slackRows.length > 0, (kind, name) =>
      buildInvestigationStep(kind, name, automationId, automation, notificationDestinations)
    ),
  };

  return stringify(workflowObj, { lineWidth: 0 });
}

type TriggerKind = 'alert' | 'slack';

/**
 * A run is started by exactly one trigger, but its payload differs by kind, so each kind gets its
 * own investigation step. With a single kind the step runs unguarded. With several, each step is
 * guarded on `execution.triggeredBy`, which holds the id of the trigger that fired.
 */
function buildSteps(
  hasAlert: boolean,
  hasSlack: boolean,
  buildStep: (kind: TriggerKind, name: string) => Record<string, unknown>
): unknown[] {
  if (hasAlert && hasSlack) {
    return [
      guardedStep('alert', ALERT_TRIGGER_TYPE, buildStep),
      guardedStep('slack', SLACK_MESSAGE_TRIGGER_TYPE, buildStep),
    ];
  }
  return [buildStep(hasSlack ? 'slack' : 'alert', 'trigger_investigation')];
}

function guardedStep(
  kind: TriggerKind,
  triggerType: string,
  buildStep: (kind: TriggerKind, name: string) => Record<string, unknown>
): Record<string, unknown> {
  return {
    name: `on_${kind}_trigger`,
    type: 'if',
    condition: `\${{ execution.triggeredBy == '${triggerType}' }}`,
    steps: [buildStep(kind, `trigger_investigation_${kind}`)],
  };
}

function buildInvestigationStep(
  kind: TriggerKind,
  name: string,
  automationId: string,
  automation: NightshiftAutomationAttributes,
  notificationDestinations: InvestigationNotificationDestination[] | undefined
): Record<string, unknown> {
  // The alert shape also covers an automation with no alert or Slack rows, which runs from the
  // manual trigger and has no payload to read.
  const hasAlertRows = automation.trigger.rows.some((r) => r.kind === 'alert');
  return {
    name,
    type: 'nightshift.triggerInvestigation',
    with: {
      ...(kind === 'slack'
        ? { subject_type: 'manual', subject_id: SLACK_SUBJECT_ID, title: automation.name }
        : {
            subject_type: 'alert',
            subject_id: hasAlertRows ? '{{ trigger.alert.uuid }}' : automationId,
            title: hasAlertRows ? '{{ trigger.rule.name }}' : automation.name,
          }),
      summary: automation.name,
      trigger_type: 'automatic',
      concurrency_key: automationId,
      ...buildMessage(automation.execution.promptTemplate, kind === 'slack'),
      ...(notificationDestinations ? { notificationDestinations } : {}),
    },
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

function isSlackRow(row: NightshiftTriggerRow): row is SlackRow {
  return row.kind === 'slack';
}

/**
 * The prompt for the investigation. A Slack-triggered run has no alert data to compose a brief
 * from, so the message itself is appended to the prompt. The text is truncated to stay under the
 * investigation step's message limit.
 */
function buildMessage(
  promptTemplate: string | undefined,
  includeSlackMessage: boolean
): { message?: string } {
  if (!includeSlackMessage) {
    return promptTemplate ? { message: promptTemplate } : {};
  }
  return {
    message: [promptTemplate, SLACK_MESSAGE_PROMPT].filter(Boolean).join('\n\n'),
  };
}

function buildTriggers(alertRows: AlertRow[], slackRows: SlackRow[]): unknown[] {
  const triggers: unknown[] = [];

  if (alertRows.length > 0) {
    const trigger: Record<string, unknown> = { type: ALERT_TRIGGER_TYPE };
    const condition = buildCondition(alertRows);
    if (condition) {
      trigger.on = { condition };
    }
    triggers.push(trigger);
  }

  if (slackRows.length > 0) {
    // One trigger for all Slack rows: two triggers that both match a message would start the
    // workflow twice for it.
    const trigger: Record<string, unknown> = {
      type: SLACK_MESSAGE_TRIGGER_TYPE,
      'connector-id': ELASTIC_APPS_SLACK_CONNECTOR_ID,
    };
    const condition = buildSlackCondition(slackRows);
    if (condition) {
      trigger.on = { condition };
    }
    triggers.push(trigger);
  }

  return triggers.length > 0 ? triggers : [{ type: 'manual' }];
}

/**
 * KQL over the `slack2.message` event payload, built only from the filters on the trigger rows.
 * Nothing is excluded beyond what the user chose. The Relay already drops the Slack app's own
 * posts and edits.
 *
 * `channels` and `users` are matched against `event.channel` and `event.sender`, which are Slack
 * ids, so a channel name never matches. `messageFilter` is a phrase match, not a substring match.
 * A row with no filters matches every message, so no condition is emitted at all.
 */
function buildSlackCondition(rows: SlackRow[]): string {
  const rowConditions = rows.map(buildSlackRowCondition);
  if (rowConditions.some((c) => c === '')) return '';
  if (rowConditions.length === 1) return rowConditions[0];
  return rowConditions.map((c) => `(${c})`).join(' or ');
}

function buildSlackRowCondition(row: SlackRow): string {
  const parts: string[] = [];

  const channels = cleanValues(row.channels);
  if (channels.length > 0) {
    parts.push(kqlOneOf('event.channel', channels));
  }

  const users = cleanValues(row.users);
  if (users.length > 0) {
    parts.push(kqlOneOf('event.sender', users));
  }

  const messageFilter = row.messageFilter?.trim();
  if (messageFilter) {
    parts.push(`event.text:"${escapeKql(messageFilter)}"`);
  }

  return parts.join(' and ');
}

function cleanValues(values: string[] | undefined): string[] {
  return (values ?? []).map((v) => v.trim()).filter(Boolean);
}

function kqlOneOf(field: string, values: string[]): string {
  const clauses = values.map((v) => `${field}:"${escapeKql(v)}"`);
  return clauses.length === 1 ? clauses[0] : `(${clauses.join(' or ')})`;
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
