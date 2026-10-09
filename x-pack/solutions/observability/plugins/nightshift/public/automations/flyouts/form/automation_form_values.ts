/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Automation } from '../../hooks/use_automations';

export type AlertStatus = 'any' | 'active' | 'inactive';
export type ScheduleUnit = 'hour' | 'day' | 'week';
export type InstructionMode = 'ask' | 'investigate';
export type SlackTarget = 'channel' | 'self' | 'thread';
const SLACK_TARGETS: SlackTarget[] = ['channel', 'self', 'thread'];

export const SLACK_TRIGGER_EVENTS = {
  slack_message: 'message',
} as const;
export type SlackTriggerKind = keyof typeof SLACK_TRIGGER_EVENTS;

const SLACK_EVENT_TO_FORM_KIND = {
  message: 'slack_message',
} as const;

export const isSlackTriggerKind = (kind: string): kind is SlackTriggerKind =>
  kind in SLACK_TRIGGER_EVENTS;

export type TriggerFormValues =
  | {
      kind: 'alert';
      ruleNamePattern: string;
      ruleTags: string[];
      alertStatus: AlertStatus;
    }
  | {
      kind: 'every';
      unit: ScheduleUnit;
      time: string;
      daysOfWeek: number[];
      betweenHours: boolean;
      startTime: string;
      endTime: string;
      timezone: string;
    }
  | { kind: 'cron'; cronExpression: string; timezone: string }
  | { kind: SlackTriggerKind; channels: string[]; users: string[]; messageFilter: string };

export type SlackTriggerFormValues = Extract<TriggerFormValues, { kind: SlackTriggerKind }>;

export const isSlackTrigger = (trigger: TriggerFormValues): trigger is SlackTriggerFormValues =>
  isSlackTriggerKind(trigger.kind);

export interface SlackActionFormValues {
  target: SlackTarget;
  destination: string;
}

export const SLACK_THREAD_ACTION: SlackActionFormValues = { target: 'thread', destination: '' };

export interface AutomationFormValues {
  name: string;
  tags: string[];
  description: string;
  trigger?: TriggerFormValues;
  dailyDispatchLimit: string;
  instructions: string;
  mode: InstructionMode;
  slackAction?: SlackActionFormValues;
  isEnabled: boolean;
}

export const DEFAULT_TIMEZONE = 'UTC';
export const DEFAULT_CRON = '0 9 * * *';
const WEEKDAYS = [1, 2, 3, 4, 5];

export const createTriggerFormValues = (kind: TriggerFormValues['kind']): TriggerFormValues => {
  if (isSlackTriggerKind(kind)) {
    return { kind, channels: [], users: [], messageFilter: '' };
  }
  if (kind === 'alert') {
    return { kind, ruleNamePattern: '', ruleTags: [], alertStatus: 'any' };
  }
  if (kind === 'cron') {
    return { kind, cronExpression: DEFAULT_CRON, timezone: DEFAULT_TIMEZONE };
  }
  return {
    kind,
    unit: 'hour',
    time: '09:00',
    daysOfWeek: WEEKDAYS,
    betweenHours: false,
    startTime: '09:00',
    endTime: '17:00',
    timezone: DEFAULT_TIMEZONE,
  };
};

export const createAutomationFormValues = (): AutomationFormValues => ({
  name: '',
  tags: [],
  description: '',
  trigger: undefined,
  dailyDispatchLimit: '20',
  instructions: '',
  mode: 'investigate',
  slackAction: undefined,
  isEnabled: false,
});

const parseDaysOfWeek = (field: string): number[] =>
  field.split(',').flatMap((part) => {
    const [from, to = from] = part.split('-').map(Number);
    return Array.from({ length: Math.max(to - from + 1, 0) }, (_, index) => from + index);
  });

export const toAutomationFormValues = (automation: Automation): AutomationFormValues => {
  const row = automation.trigger.rows[0];
  const [completion] = automation.completions;
  const schedule = row?.kind === 'schedule' ? row : undefined;
  const cronFields = schedule?.cronExpression?.split(' ') ?? [];
  const isHourly = schedule?.schedulePreset === 'hourly';
  const isWeekly = schedule?.schedulePreset === 'weekly';
  const trigger: TriggerFormValues | undefined =
    row?.kind === 'alert'
      ? {
          kind: 'alert',
          ruleNamePattern: row.ruleNamePattern ?? '',
          ruleTags: row.tags ?? [],
          alertStatus: row.alertStatus ?? 'any',
        }
      : row?.kind === 'slack'
      ? {
          kind: SLACK_EVENT_TO_FORM_KIND[row.event],
          channels: row.channels ?? [],
          users: row.users ?? [],
          messageFilter: row.messageFilter ?? '',
        }
      : schedule
      ? isHourly || schedule.schedulePreset === 'daily' || isWeekly
        ? {
            kind: 'every',
            unit: isHourly ? 'hour' : isWeekly ? 'week' : 'day',
            time: `${(cronFields[1] ?? '9').padStart(2, '0')}:${(cronFields[0] ?? '0').padStart(
              2,
              '0'
            )}`,
            daysOfWeek: parseDaysOfWeek(cronFields[4] ?? '1,2,3,4,5'),
            betweenHours: isHourly && cronFields[1] !== '*',
            startTime: `${(cronFields[1]?.split('-')[0] ?? '9').padStart(2, '0')}:00`,
            endTime: `${(cronFields[1]?.split('-')[1] ?? '17').padStart(2, '0')}:00`,
            timezone: schedule.timezone ?? DEFAULT_TIMEZONE,
          }
        : {
            kind: 'cron',
            cronExpression: schedule.cronExpression ?? DEFAULT_CRON,
            timezone: schedule.timezone ?? DEFAULT_TIMEZONE,
          }
      : undefined;

  return {
    name: automation.name,
    tags: automation.tags ?? [],
    description: automation.description ?? '',
    trigger,
    dailyDispatchLimit: String(automation.runtime.dailyDispatchLimit ?? 20),
    instructions: automation.execution.promptTemplate ?? '',
    mode: automation.execution.reasoningMode === 'investigate' ? 'investigate' : 'ask',
    slackAction:
      completion?.action === 'post_to_slack'
        ? {
            target: SLACK_TARGETS.find((target) => target === completion.targetMode) ?? 'channel',
            destination: completion.destination ?? '',
          }
        : undefined,
    isEnabled: automation.isEnabled,
  };
};
