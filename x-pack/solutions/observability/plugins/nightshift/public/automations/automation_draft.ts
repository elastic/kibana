/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NightshiftInvestigationsAPIClientRequestParamsOf } from '@kbn/nightshift-investigations-plugin/public';
import type { Automation } from '../hooks/use_automations';

export type CreateAutomationBody =
  NightshiftInvestigationsAPIClientRequestParamsOf<'POST /internal/nightshift/automations'>['params']['body'];

export type AlertStatus = 'any' | 'active' | 'inactive';
export type ScheduleUnit = 'hour' | 'day' | 'week';
export type InstructionMode = 'ask' | 'investigate';
export type SlackTarget = 'channel' | 'self';

export type TriggerDraft =
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
  | { kind: 'cron'; cronExpression: string; timezone: string };

export interface SlackActionDraft {
  target: SlackTarget;
  destination: string;
}

export interface AutomationDraft {
  name: string;
  tags: string[];
  description: string;
  trigger?: TriggerDraft;
  dailyDispatchLimit: string;
  instructions: string;
  mode: InstructionMode;
  slackAction?: SlackActionDraft;
  isEnabled: boolean;
}

export const DEFAULT_TIMEZONE = 'UTC';
export const DEFAULT_CRON = '0 9 * * *';
const WEEKDAYS = [1, 2, 3, 4, 5];

export const createTriggerDraft = (kind: TriggerDraft['kind']): TriggerDraft => {
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

const toTriggerDraft = (row: Automation['trigger']['rows'][number]): TriggerDraft =>
  row.kind === 'alert'
    ? {
        kind: 'alert',
        ruleNamePattern: row.ruleNamePattern ?? '',
        ruleTags: row.tags ?? [],
        alertStatus: row.alertStatus ?? 'any',
      }
    : {
        kind: 'cron',
        cronExpression: row.cronExpression ?? DEFAULT_CRON,
        timezone: row.timezone ?? DEFAULT_TIMEZONE,
      };

export const createAutomationDraft = (automation?: Automation): AutomationDraft => {
  const { completion, execution } = automation ?? {};
  const firstRow = automation?.trigger.rows[0];
  return {
    name: automation?.name ?? '',
    tags: automation?.tags ?? [],
    description: automation?.description ?? '',
    trigger: firstRow ? toTriggerDraft(firstRow) : undefined,
    dailyDispatchLimit: String(automation?.runtime.dailyDispatchLimit ?? 20),
    instructions: execution?.promptTemplate ?? '',
    mode: execution?.reasoningMode === 'investigate' ? 'investigate' : 'ask',
    slackAction:
      completion?.action === 'post_to_slack'
        ? {
            target: completion.targetMode === 'self' ? 'self' : 'channel',
            destination: completion.destination ?? '',
          }
        : undefined,
    isEnabled: false,
  };
};

const toCronTime = (time: string): { minute: number; hour: number } => {
  const [hour, minute] = time.split(':').map(Number);
  return { minute, hour };
};

export const toEveryCron = (trigger: Extract<TriggerDraft, { kind: 'every' }>): string => {
  const { minute, hour } = toCronTime(trigger.time);
  if (trigger.unit === 'hour') {
    const hours = trigger.betweenHours
      ? `${toCronTime(trigger.startTime).hour}-${toCronTime(trigger.endTime).hour}`
      : '*';
    return `0 ${hours} * * *`;
  }
  const days = trigger.unit === 'week' ? [...trigger.daysOfWeek].sort().join(',') : '*';
  return `${minute} ${hour} * * ${days}`;
};

const CRON_FIELD = /^[\d*/,-]+$/;

export const isValidCron = (expression: string): boolean => {
  const fields = expression.trim().split(/\s+/);
  return fields.length === 5 && fields.every((field) => CRON_FIELD.test(field));
};

export const isValidDailyLimit = (value: string): boolean => {
  const limit = Number(value);
  return value.trim() !== '' && Number.isInteger(limit) && limit >= 1 && limit <= 200;
};

export const hasDailyLimit = (trigger?: TriggerDraft): boolean =>
  trigger !== undefined && trigger.kind !== 'cron';

export const isTriggerValid = (trigger?: TriggerDraft): trigger is TriggerDraft => {
  if (!trigger) return false;
  if (trigger.kind === 'cron') return isValidCron(trigger.cronExpression);
  if (trigger.kind === 'every' && trigger.unit === 'week') return trigger.daysOfWeek.length > 0;
  return true;
};

const toTriggerRow = (trigger: TriggerDraft): CreateAutomationBody['trigger']['rows'][number] => {
  if (trigger.kind === 'alert') {
    const ruleNamePattern = trigger.ruleNamePattern.trim();
    return {
      kind: 'alert',
      ...(ruleNamePattern ? { ruleNamePattern } : {}),
      ...(trigger.alertStatus !== 'any' ? { alertStatus: trigger.alertStatus } : {}),
      ...(trigger.ruleTags.length ? { tags: trigger.ruleTags } : {}),
    };
  }
  if (trigger.kind === 'cron') {
    return {
      kind: 'schedule',
      schedulePreset: 'custom',
      cronExpression: trigger.cronExpression.trim(),
      timezone: trigger.timezone,
    };
  }
  const presets = { hour: 'hourly', day: 'daily', week: 'weekly' } as const;
  return {
    kind: 'schedule',
    schedulePreset: presets[trigger.unit],
    cronExpression: toEveryCron(trigger),
    timezone: trigger.timezone,
  };
};

export const toCreateAutomationBody = (
  draft: AutomationDraft & { trigger: TriggerDraft }
): CreateAutomationBody => {
  const description = draft.description.trim();
  const instructions = draft.instructions.trim();
  const destination = draft.slackAction?.destination.trim();
  return {
    name: draft.name.trim(),
    ...(description ? { description } : {}),
    ...(draft.tags.length ? { tags: draft.tags } : {}),
    isEnabled: draft.isEnabled,
    trigger: { rows: [toTriggerRow(draft.trigger)] },
    execution: {
      ...(instructions ? { promptTemplate: instructions } : {}),
      reasoningMode: draft.mode === 'investigate' ? 'investigate' : 'observe',
    },
    completion: draft.slackAction
      ? { action: 'post_to_slack', targetMode: draft.slackAction.target, destination }
      : {},
    runtime: hasDailyLimit(draft.trigger)
      ? { dailyDispatchLimit: Number(draft.dailyDispatchLimit) }
      : {},
  };
};
