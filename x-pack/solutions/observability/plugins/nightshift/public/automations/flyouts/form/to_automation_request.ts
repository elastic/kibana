/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type {
  Automation,
  CreateAutomationBody,
  UpdateAutomationBody,
} from '../../hooks/use_automations';
import {
  SLACK_TRIGGER_EVENTS,
  toAutomationFormValues,
  isSlackTrigger,
  type AutomationFormValues,
  type TriggerFormValues,
} from './automation_form_values';
import { hasDailyLimit } from './validation';

const toCronTime = (time: string): { minute: number; hour: number } => {
  const [hour, minute] = time.split(':').map(Number);
  return { minute, hour };
};

export const toEveryCron = (trigger: Extract<TriggerFormValues, { kind: 'every' }>): string => {
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

const toTriggerRow = (
  trigger: TriggerFormValues
): CreateAutomationBody['trigger']['rows'][number] => {
  if (trigger.kind === 'alert') {
    const ruleNamePattern = trigger.ruleNamePattern.trim();
    return {
      kind: 'alert',
      ...(ruleNamePattern ? { ruleNamePattern } : {}),
      ...(trigger.ruleNames.length ? { ruleNames: trigger.ruleNames } : {}),
      ...(trigger.alertStatus !== 'any' ? { alertStatus: trigger.alertStatus } : {}),
      ...(trigger.ruleTags.length ? { tags: trigger.ruleTags } : {}),
    };
  }
  if (isSlackTrigger(trigger)) {
    const messageFilter = trigger.messageFilter.trim();
    return {
      kind: 'slack',
      event: SLACK_TRIGGER_EVENTS[trigger.kind],
      ...(trigger.channels.length ? { channels: trigger.channels } : {}),
      ...(trigger.users.length ? { users: trigger.users } : {}),
      ...(messageFilter ? { messageFilter } : {}),
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

export const toAutomationRequestBody = (
  values: AutomationFormValues & { trigger: TriggerFormValues }
): CreateAutomationBody => {
  const description = values.description.trim();
  const instructions = values.instructions.trim();
  const destination = values.slackAction?.destination.trim();
  return {
    name: values.name.trim(),
    ...(description ? { description } : {}),
    ...(values.tags.length ? { tags: values.tags } : {}),
    isEnabled: values.isEnabled,
    trigger: { rows: [toTriggerRow(values.trigger)] },
    execution: {
      ...(instructions ? { promptTemplate: instructions } : {}),
      reasoningMode: values.mode === 'investigate' ? 'investigate' : 'observe',
    },
    completion: !values.slackAction
      ? {}
      : values.slackAction.target === 'thread'
      ? { action: 'post_to_slack', targetMode: 'thread' }
      : { action: 'post_to_slack', targetMode: values.slackAction.target, destination },
    runtime: hasDailyLimit(values.trigger)
      ? { dailyDispatchLimit: Number(values.dailyDispatchLimit) }
      : {},
  };
};

type TriggerRow = CreateAutomationBody['trigger']['rows'][number];

const keepUnmodeledFields = (original: TriggerRow, row: TriggerRow): TriggerRow => {
  if (original.kind === 'alert' && row.kind === 'alert' && original.ruleNameMatchMode) {
    return { ...row, ruleNameMatchMode: original.ruleNameMatchMode };
  }
  if (original.kind === 'schedule' && row.kind === 'schedule' && original.scopeQuery) {
    return { ...row, scopeQuery: original.scopeQuery };
  }
  return row;
};

const toUpdatedTrigger = (
  row: TriggerRow,
  originalRows: TriggerRow[]
): CreateAutomationBody['trigger'] => {
  const [original, ...otherRows] = originalRows;
  return original?.kind === row.kind
    ? { rows: [keepUnmodeledFields(original, row), ...otherRows] }
    : { rows: [row] };
};

const toUpdatedCompletion = (
  values: AutomationFormValues,
  automation: Automation
): NonNullable<UpdateAutomationBody['completion']> => {
  if (values.slackAction?.target === 'thread') {
    return {
      ...automation.completion,
      action: 'post_to_slack',
      targetMode: 'thread',
      destination: null,
    };
  }
  if (values.slackAction) {
    return {
      ...automation.completion,
      action: 'post_to_slack',
      targetMode:
        automation.completion.targetMode === 'thread' && values.slackAction.target === 'channel'
          ? 'thread'
          : values.slackAction.target,
      destination: values.slackAction.destination.trim(),
    };
  }
  return automation.completion.action === 'post_to_slack'
    ? { ...automation.completion, action: null, targetMode: null, destination: null }
    : automation.completion;
};

export const toAutomationUpdateBody = (
  values: AutomationFormValues & { trigger: TriggerFormValues },
  automation: Automation
): UpdateAutomationBody & { name: string } => {
  const request = toAutomationRequestBody(values);
  const originalValues = toAutomationFormValues(automation);
  return {
    name: request.name,
    description: request.description ?? null,
    tags: request.tags ?? [],
    trigger: isEqual(originalValues.trigger, values.trigger)
      ? automation.trigger
      : toUpdatedTrigger(request.trigger.rows[0], automation.trigger.rows),
    execution: {
      ...automation.execution,
      ...request.execution,
      promptTemplate: values.instructions.trim() || null,
    },
    completion: toUpdatedCompletion(values, automation),
    runtime: {
      ...automation.runtime,
      ...(hasDailyLimit(values.trigger)
        ? { dailyDispatchLimit: Number(values.dailyDispatchLimit) }
        : hasDailyLimit(originalValues.trigger)
        ? { dailyDispatchLimit: null }
        : {}),
    },
  };
};
