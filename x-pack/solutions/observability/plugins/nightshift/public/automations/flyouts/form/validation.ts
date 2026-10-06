/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AutomationFormValues, TriggerFormValues } from './automation_form_values';

export const validationLabels = {
  cronError: i18n.translate('xpack.nightshift.automations.flyout.cronError', {
    defaultMessage: 'Fix the cron expression to save',
  }),
  channelRequired: i18n.translate('xpack.nightshift.automations.flyout.channelRequired', {
    defaultMessage: 'Choose a Slack channel to post to before saving',
  }),
  personRequired: i18n.translate('xpack.nightshift.automations.flyout.personRequired', {
    defaultMessage: 'Choose who to message in Slack before saving',
  }),
};

const CRON_FIELD = /^[\d*/,-]+$/;

export const isValidCron = (expression: string): boolean => {
  const fields = expression.trim().split(/\s+/);
  return fields.length === 5 && fields.every((field) => CRON_FIELD.test(field));
};

const getHour = (time: string): number => Number(time.split(':')[0]);

export const isValidDailyLimit = (value: string): boolean => {
  const limit = Number(value);
  return value.trim() !== '' && Number.isInteger(limit) && limit >= 1 && limit <= 200;
};

export const hasDailyLimit = (trigger?: TriggerFormValues): boolean =>
  trigger !== undefined && trigger.kind !== 'cron';

export const isTriggerValid = (trigger?: TriggerFormValues): trigger is TriggerFormValues => {
  if (!trigger) return false;
  if (trigger.kind === 'cron') return isValidCron(trigger.cronExpression);
  if (trigger.kind === 'every' && trigger.unit === 'week') return trigger.daysOfWeek.length > 0;
  if (trigger.kind === 'every' && trigger.unit === 'hour' && trigger.betweenHours) {
    return getHour(trigger.startTime) < getHour(trigger.endTime);
  }
  return true;
};

export const getSaveBlocker = (values: AutomationFormValues): string | undefined => {
  if (values.trigger?.kind === 'cron' && !isValidCron(values.trigger.cronExpression)) {
    return validationLabels.cronError;
  }
  if (values.slackAction && !values.slackAction.destination.trim()) {
    return values.slackAction.target === 'channel'
      ? validationLabels.channelRequired
      : validationLabels.personRequired;
  }
  return undefined;
};

export const canSaveAutomation = (values: AutomationFormValues): boolean =>
  isTriggerValid(values.trigger) &&
  (!hasDailyLimit(values.trigger) || isValidDailyLimit(values.dailyDispatchLimit)) &&
  !getSaveBlocker(values);
