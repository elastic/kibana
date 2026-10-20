/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify } from 'yaml';
import { DEFAULT_MANUAL_INVESTIGATION_SUBJECT_ID } from '../../../common';
import { parsePresetSchedule } from '../../../common/automation_schedule';
import type { InvestigationNotificationDestination } from '../../../common';
import type { NightshiftAutomationAttributes, NightshiftTriggerRow, OverlapPolicy } from './types';

// alerting.v1.alertStatusChanged uses 'active'/'recovered'; our AlertStatus uses 'active'/'inactive'.
const ALERT_STATUS_TO_KQL: Record<string, string> = {
  active: 'active',
  inactive: 'recovered',
};

// Defaults to the Elastic Slack app when no connector is selected; the channel remains user-selected.
// Mirrors significant_events/server/lib/slack_app/service.ts, which depends on this plugin.
export const ELASTIC_APPS_SLACK_CONNECTOR_ID = 'elastic-apps-slack';

const ALERT_TRIGGER_TYPE = 'alerting.v1.alertStatusChanged';
const SLACK_MESSAGE_TRIGGER_TYPE = 'slack2.message';
const AUTOMATION_TIMEOUT_MARGIN_SECONDS = 60;

// Top-level messages only, since replies are handled by the managed Slack thread workflow. Edits
// carry a subtype and are left out. Posts from other bots are allowed, so an alert another bot
// posts can start an investigation.
const SLACK_MESSAGE_EXCLUSIONS = [
  'event.workspace:*',
  'not event.threadId:*',
  '(not event.subtype:* or event.subtype:bot_message or event.subtype:file_share)',
];

// One investigation per message, so concurrent messages in a channel do not share a subject.
const SLACK_SUBJECT_ID = '{{ event.connectorId }}:{{ event.channel }}:{{ event.messageId }}';

// The message's thread, which the managed Slack thread workflow looks the investigation up by when
// someone replies. Only recorded for an automation that already reports in that thread: it makes
// a reply there report the investigation, which a silent or channel-mode automation does not do.
// The trigger condition guarantees a workspace.
const SLACK_THREAD = {
  workspace: '{{ event.workspace }}',
  channel: '{{ event.channel }}',
  thread_ts: '{{ event.messageId }}',
};

// See MAX_PROMPT_TEMPLATE_LENGTH: the template and this text share the step's message limit.
export const SLACK_MESSAGE_TEXT_LIMIT = 4000;

const SLACK_MESSAGE_PROMPT = `Slack message from {{ event.sender }} in channel {{ event.channel }}:\n\n{{ event.text | truncate: ${SLACK_MESSAGE_TEXT_LIMIT} }}`;

type AlertRow = Extract<NightshiftTriggerRow, { kind: 'alert' }>;
type SlackRow = Extract<NightshiftTriggerRow, { kind: 'slack' }>;

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
  const alertRows = automation.trigger.rows.filter((row): row is AlertRow => row.kind === 'alert');
  const slackRows = automation.trigger.rows.filter(isSlackRow);
  const schedule = automation.trigger.rows.find((row) => row.kind === 'schedule');
  const hasMultipleTriggers =
    Number(alertRows.length > 0) + Number(slackRows.length > 0) + Number(Boolean(schedule)) > 1;
  const alertWorkflow =
    alertRows.length > 0 || (slackRows.length === 0 && !schedule)
      ? generateAlertWorkflow(automationId, automation, alertRows, hasMultipleTriggers)
      : undefined;
  const slackWorkflow =
    slackRows.length > 0
      ? generateSlackWorkflow(automationId, automation, slackRows, hasMultipleTriggers)
      : undefined;
  const scheduledWorkflow = schedule
    ? generateScheduledWorkflow(automationId, automation, schedule)
    : undefined;
  const workflowParts = [scheduledWorkflow, alertWorkflow, slackWorkflow].filter(
    (part) => part !== undefined
  );

  const strategy = automation.runtime.overlapPolicy
    ? OVERLAP_POLICY_TO_STRATEGY[automation.runtime.overlapPolicy]
    : 'drop';

  const workflowObj = {
    name: automation.name,
    enabled: automation.isEnabled,
    tags: ['nightshift', 'automation'],
    settings: {
      // The automation starts first and waits for the investigation, so its deadline
      // needs extra time for setup and returning the investigation result.
      ...(automation.runtime.timeoutSeconds !== undefined
        ? { timeout: `${automation.runtime.timeoutSeconds + AUTOMATION_TIMEOUT_MARGIN_SECONDS}s` }
        : {}),
      concurrency: {
        key: buildWorkflowConcurrencyKey(automationId, alertRows.length > 0, slackRows.length > 0),
        strategy,
        max: 1,
      },
    },
    triggers: [
      ...(alertWorkflow?.triggers ?? []),
      ...(slackWorkflow?.triggers ?? []),
      ...(scheduledWorkflow?.triggers ?? []),
    ],
    steps: workflowParts.flatMap((part) =>
      hasMultipleTriggers ? [guardedStep(part.kind, part.triggers[0].type, part.steps)] : part.steps
    ),
  };

  return stringify(workflowObj, { lineWidth: 0 });
}

function generateAlertWorkflow(
  automationId: string,
  automation: NightshiftAutomationAttributes,
  alertRows: Array<Extract<NightshiftTriggerRow, { kind: 'alert' }>>,
  hasMultipleTriggers: boolean
) {
  const condition = buildCondition(alertRows);
  const notificationDestinations = buildNotificationDestinations(automationId, automation, 'alert');

  return {
    kind: 'alert' as const,
    triggers: [
      alertRows.length > 0
        ? {
            type: ALERT_TRIGGER_TYPE,
            ...(condition ? { on: { condition } } : {}),
          }
        : { type: 'manual' },
    ],
    steps: [
      {
        name: hasMultipleTriggers ? 'trigger_investigation_alert' : 'trigger_investigation',
        type: 'nightshift.triggerInvestigation',
        with: {
          automation_id: automationId,
          subject_type: alertRows.length > 0 ? 'alert' : 'manual',
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
  schedule: Extract<NightshiftTriggerRow, { kind: 'schedule' }>
) {
  const parsed = parsePresetSchedule(schedule);
  if (!parsed.success) throw new Error(parsed.error);
  const notificationDestinations = buildNotificationDestinations(
    automationId,
    automation,
    'schedule'
  );

  return {
    kind: 'schedule' as const,
    triggers: [parsed.trigger],
    steps: [
      {
        name: 'trigger_investigation',
        type: 'nightshift.triggerInvestigation',
        with: {
          automation_id: automationId,
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

type TriggerKind = 'alert' | 'slack' | 'schedule';

/**
 * One investigation per alert and per Slack message, so a new one does not cancel or drop the
 * previous one. Scheduled runs have no event payload and share one concurrency key per automation.
 */
const ALERT_CONCURRENCY_SUFFIX = '{{ trigger.alert.uuid }}';
const SLACK_CONCURRENCY_SUFFIX = '{{ event.channel }}-{{ event.messageId }}';

function buildConcurrencyKey(
  kind: TriggerKind,
  automationId: string,
  hasAlertRows: boolean
): string {
  if (kind === 'slack') return `${automationId}-${SLACK_CONCURRENCY_SUFFIX}`;
  return hasAlertRows ? `${automationId}-${ALERT_CONCURRENCY_SUFFIX}` : automationId;
}

// A run only has the payload of the trigger that fired, and a missing variable renders as empty,
// so the key can name both kinds.
function buildWorkflowConcurrencyKey(
  automationId: string,
  hasAlertRows: boolean,
  hasSlackRows: boolean
): string {
  if (hasAlertRows && hasSlackRows) {
    return `${automationId}-${ALERT_CONCURRENCY_SUFFIX}${SLACK_CONCURRENCY_SUFFIX}`;
  }
  return buildConcurrencyKey(hasSlackRows ? 'slack' : 'alert', automationId, hasAlertRows);
}

function guardedStep(
  kind: TriggerKind,
  triggerType: string,
  steps: unknown[]
): Record<string, unknown> {
  return {
    name: `on_${kind}_trigger`,
    type: 'if',
    condition: `\${{ execution.triggeredBy == '${triggerType}' }}`,
    steps,
  };
}

function generateSlackWorkflow(
  automationId: string,
  automation: NightshiftAutomationAttributes,
  slackRows: SlackRow[],
  hasMultipleTriggers: boolean
) {
  const notificationDestinations = buildNotificationDestinations(automationId, automation, 'slack');
  const repliesInMessageThread = notificationDestinations?.some(({ params }) => params.thread_ts);
  const condition = buildSlackCondition(slackRows);
  // One trigger combines all Slack rows so a message matching several rows starts only one run.
  return {
    kind: 'slack' as const,
    triggers: [
      {
        type: SLACK_MESSAGE_TRIGGER_TYPE,
        'connector-id': ELASTIC_APPS_SLACK_CONNECTOR_ID,
        ...(condition ? { on: { condition } } : {}),
      },
    ],
    steps: [
      {
        name: hasMultipleTriggers ? 'trigger_investigation_slack' : 'trigger_investigation',
        type: 'nightshift.triggerInvestigation',
        with: {
          automation_id: automationId,
          subject_type: 'manual',
          subject_id: SLACK_SUBJECT_ID,
          ...(repliesInMessageThread ? { slack_thread: SLACK_THREAD } : {}),
          title: automation.name,
          summary: automation.name,
          trigger_type: 'automatic',
          ...buildMessage(automation.execution.promptTemplate, true),
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
 * The Slack destination the investigation posts its progress and outcome to, copied onto the run
 * so delivery needs no automation lookup.
 *
 * `channel` mode posts to the configured channel. `thread` mode only makes sense for a run started
 * by a Slack message: it replies under that message, so the first notification joins the thread
 * and does not start a new one. An alert-triggered run has no message to reply to, so it gets no
 * destination in `thread` mode.
 */
function buildNotificationDestinations(
  automationId: string,
  automation: NightshiftAutomationAttributes,
  kind: TriggerKind
): InvestigationNotificationDestination[] | undefined {
  const destinations: InvestigationNotificationDestination[] = [];
  for (const completion of automation.completions) {
    if (completion.action !== 'post_to_slack') {
      continue;
    }
    const base = {
      type: 'slack' as const,
      connector_id: completion.connectorId ?? ELASTIC_APPS_SLACK_CONNECTOR_ID,
      automation_id: automationId,
      automation_name: automation.name,
    };
    if (completion.targetMode === 'channel' && completion.destination) {
      destinations.push({ ...base, params: { channel: completion.destination } });
    } else if (completion.targetMode === 'thread' && kind === 'slack') {
      destinations.push({
        ...base,
        params: { channel: '{{ event.channel }}', thread_ts: '{{ event.messageId }}' },
      });
    }
  }
  return destinations.length > 0 ? destinations : undefined;
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

/**
 * KQL over the `slack2.message` event payload: the fixed exclusions, then the row filters.
 *
 * `channels` and `users` are matched against `event.channel` and `event.sender`, which are Slack
 * ids, so a channel name never matches. The message filter is a case sensitive contains check, see
 * `buildMessageFilterTerms`. A row with no filters matches every message the exclusions let
 * through.
 */
function buildSlackCondition(rows: SlackRow[]): string {
  const exclusions = SLACK_MESSAGE_EXCLUSIONS.join(' and ');
  const rowConditions = rows.map(buildSlackRowCondition);
  if (rowConditions.some((c) => c === '')) return exclusions;
  const rowFilter =
    rowConditions.length === 1 ? rowConditions[0] : rowConditions.map((c) => `(${c})`).join(' or ');
  return `${exclusions} and (${rowFilter})`;
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
    parts.push(buildMessageFilterTerms(messageFilter));
  }

  return parts.join(' and ');
}

/**
 * The message filter as one unquoted wildcard term. A quoted value is compared for equality with
 * the whole field by the in-memory evaluator, so it cannot express "contains". Wildcards are case
 * sensitive.
 */
function buildMessageFilterTerms(messageFilter: string): string {
  return `event.text: *${escapeKqlWildcardTerm(messageFilter)}*`;
}

/**
 * Escapes KQL syntax characters, and writes every whitespace character as a unicode escape.
 *
 * The KQL grammar ends an unquoted value at "not" followed by whitespace, including the end of a
 * word such as "cannot", and `\not` cannot escape it because the grammar reads `\n` first. The
 * keywords `and` and `or` are also only recognised between whitespace characters. An escaped
 * whitespace character is never seen as whitespace by those rules, but still parses to the same
 * character, so the phrase stays literal text and keeps its order.
 *
 * This works around a KQL parser bug, https://github.com/elastic/kibana/issues/297569. Once it is
 * fixed, the whitespace escaping can be removed.
 */
function escapeKqlWildcardTerm(text: string): string {
  return text
    .replace(/[\\():<>"*{}]/g, '\\$&')
    .replace(/[ \t\r\n ]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
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
