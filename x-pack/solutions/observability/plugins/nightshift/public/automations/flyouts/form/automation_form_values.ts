/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type AlertStatus = 'any' | 'active' | 'inactive';
export type ScheduleUnit = 'hour' | 'day' | 'week';
export type InstructionMode = 'ask' | 'investigate';
export type SlackTarget = 'channel' | 'self';

export const SLACK_TRIGGER_EVENTS = {
  slack_message: 'message',
} as const;
export type SlackTriggerKind = keyof typeof SLACK_TRIGGER_EVENTS;

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
  mode: 'ask',
  slackAction: undefined,
  isEnabled: false,
});
