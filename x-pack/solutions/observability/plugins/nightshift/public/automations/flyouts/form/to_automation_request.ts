/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateAutomationBody } from '../../hooks/use_automations';
import {
  SLACK_TRIGGER_EVENTS,
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
    completion: values.slackAction
      ? { action: 'post_to_slack', targetMode: values.slackAction.target, destination }
      : {},
    runtime: hasDailyLimit(values.trigger)
      ? { dailyDispatchLimit: Number(values.dailyDispatchLimit) }
      : {},
  };
};

export const toAutomationUpdateBody = (
  values: AutomationFormValues & { trigger: TriggerFormValues },
  automation: import('../../hooks/use_automations').Automation
) => {
  const request = toAutomationRequestBody(values);
  return {
    name: request.name,
    description: request.description ?? null,
    tags: request.tags ?? [],
    trigger: request.trigger,
    execution: {
      ...automation.execution,
      ...request.execution,
      promptTemplate: values.instructions.trim() || null,
    },
    completion: {
      ...automation.completion,
      ...(values.slackAction
        ? {
            action: 'post_to_slack' as const,
            targetMode: values.slackAction.target,
            destination: values.slackAction.destination.trim(),
          }
        : {
            action: null,
            targetMode: null,
            destination: null,
          }),
    },
    runtime: {
      ...automation.runtime,
      ...(hasDailyLimit(values.trigger)
        ? { dailyDispatchLimit: Number(values.dailyDispatchLimit) }
        : { dailyDispatchLimit: null }),
    },
  };
};
