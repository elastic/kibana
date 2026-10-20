/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  MAX_AUTOMATION_INSTRUCTIONS_LENGTH,
  parsePresetSchedule,
} from '@kbn/nightshift-investigations-plugin/common';
import { MAX_DAILY_LIMIT } from '../../utils/daily_usage';
import {
  isSlackTrigger,
  toPresetSchedule,
  type AutomationFormValues,
  type TriggerFormValues,
} from './automation_form_values';

export const validationLabels = {
  instructionsRequired: i18n.translate(
    'xpack.nightshift.automations.flyout.instructionsRequiredErrorMessage',
    {
      defaultMessage:
        'Add instructions describing what this scheduled automation should investigate.',
    }
  ),
  instructionsTooLong: i18n.translate(
    'xpack.nightshift.automations.flyout.instructionsTooLongErrorMessage',
    {
      defaultMessage: 'Instructions must be at most {limit} characters.',
      values: { limit: MAX_AUTOMATION_INSTRUCTIONS_LENGTH },
    }
  ),
  triggerRequired: i18n.translate('xpack.nightshift.automations.flyout.triggerRequired', {
    defaultMessage: 'Select a trigger to save',
  }),
  slackChannelsRequired: i18n.translate(
    'xpack.nightshift.automations.flyout.slackChannelsRequired',
    { defaultMessage: 'Select at least one channel.' }
  ),
  channelRequired: i18n.translate('xpack.nightshift.automations.flyout.channelRequired', {
    defaultMessage: 'Choose a Slack channel to post to before saving',
  }),
  personRequired: i18n.translate('xpack.nightshift.automations.flyout.personRequired', {
    defaultMessage: 'Choose who to message in Slack before saving',
  }),
};

export const isValidDailyLimit = (value: string): boolean => {
  const limit = Number(value);
  return value.trim() !== '' && Number.isInteger(limit) && limit >= 1 && limit <= MAX_DAILY_LIMIT;
};

export const isTriggerValid = (trigger?: TriggerFormValues): trigger is TriggerFormValues => {
  if (!trigger) return false;
  if (trigger.kind === 'every') {
    return parsePresetSchedule(toPresetSchedule(trigger)).success;
  }
  return true;
};

export const getSaveBlocker = (values: AutomationFormValues): string | undefined => {
  if (!values.trigger) return validationLabels.triggerRequired;
  if (values.trigger.kind === 'every') {
    if (!values.instructions.trim()) return validationLabels.instructionsRequired;
    if (values.instructions.trim().length > MAX_AUTOMATION_INSTRUCTIONS_LENGTH) {
      return validationLabels.instructionsTooLong;
    }
  }
  if (values.trigger && isSlackTrigger(values.trigger) && !values.trigger.channels.length) {
    return validationLabels.slackChannelsRequired;
  }
  if (
    values.slackAction &&
    values.slackAction.target !== 'thread' &&
    !values.slackAction.destination.trim()
  ) {
    return values.slackAction.target === 'channel'
      ? validationLabels.channelRequired
      : validationLabels.personRequired;
  }
  return undefined;
};

export const canSaveAutomation = (values: AutomationFormValues): boolean =>
  isTriggerValid(values.trigger) &&
  isValidDailyLimit(values.dailyDispatchLimit) &&
  !getSaveBlocker(values);
