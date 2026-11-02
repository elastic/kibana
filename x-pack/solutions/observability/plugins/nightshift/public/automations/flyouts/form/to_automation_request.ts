/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, omit } from 'lodash';
import type {
  Automation,
  CreateAutomationBody,
  UpdateAutomationBody,
} from '../../hooks/use_automations';
import {
  SLACK_TRIGGER_EVENTS,
  toPresetSchedule,
  toAutomationFormValues,
  isSlackTrigger,
  type AutomationFormValues,
  type TriggerFormValues,
} from './automation_form_values';

const toTriggerRow = (
  trigger: TriggerFormValues
): CreateAutomationBody['trigger']['rows'][number] => {
  if (trigger.kind === 'alert') {
    const ruleNamePattern = trigger.ruleNamePattern.trim();
    return {
      kind: 'alert',
      ...(ruleNamePattern ? { ruleNamePattern } : {}),
      ...(trigger.ruleNames.length ? { ruleNames: trigger.ruleNames } : {}),
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
      ...(trigger.bots.length ? { bots: trigger.bots } : {}),
      ...(messageFilter ? { messageFilter } : {}),
    };
  }
  return {
    kind: 'schedule',
    ...toPresetSchedule(trigger),
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
    completions: !values.slackAction
      ? []
      : values.slackAction.target === 'thread'
      ? [{ action: 'post_to_slack', targetMode: 'thread' }]
      : [{ action: 'post_to_slack', targetMode: values.slackAction.target, destination }],
    runtime: { dailyDispatchLimit: Number(values.dailyDispatchLimit) },
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

const toUpdatedCompletions = (
  values: AutomationFormValues,
  automation: Automation
): NonNullable<UpdateAutomationBody['completions']> => {
  const [completion = {}, ...otherCompletions] = automation.completions;
  if (values.slackAction?.target === 'thread') {
    return [
      { ...omit(completion, 'destination'), action: 'post_to_slack', targetMode: 'thread' },
      ...otherCompletions,
    ];
  }
  if (values.slackAction) {
    return [
      {
        ...completion,
        action: 'post_to_slack',
        targetMode:
          completion.targetMode === 'thread' && values.slackAction.target === 'channel'
            ? 'thread'
            : values.slackAction.target,
        destination: values.slackAction.destination.trim(),
      },
      ...otherCompletions,
    ];
  }
  return completion.action === 'post_to_slack' ? otherCompletions : automation.completions;
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
    completions: toUpdatedCompletions(values, automation),
    runtime: {
      ...automation.runtime,
      dailyDispatchLimit: Number(values.dailyDispatchLimit),
    },
  };
};
