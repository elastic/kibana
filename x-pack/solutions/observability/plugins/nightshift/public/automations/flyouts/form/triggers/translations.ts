/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SlackTriggerKind } from '../automation_form_values';

export const triggerLabels = {
  triggers: i18n.translate('xpack.nightshift.automations.flyout.triggers', {
    defaultMessage: 'Triggers',
  }),
  changeTrigger: i18n.translate('xpack.nightshift.automations.flyout.changeTriggerTooltip', {
    defaultMessage: 'Change trigger',
  }),
  removeTrigger: i18n.translate('xpack.nightshift.automations.flyout.removeTrigger', {
    defaultMessage: 'Remove trigger',
  }),
  slackIn: i18n.translate('xpack.nightshift.automations.flyout.slackIn', { defaultMessage: 'in' }),
  selectChannels: i18n.translate('xpack.nightshift.automations.flyout.selectChannels', {
    defaultMessage: 'Select channels',
  }),
  anyMessage: i18n.translate('xpack.nightshift.automations.flyout.anyMessage', {
    defaultMessage: 'Any message',
  }),
  messageContains: i18n.translate('xpack.nightshift.automations.flyout.messageContains', {
    defaultMessage: 'Message contains…',
  }),
  anyone: i18n.translate('xpack.nightshift.automations.flyout.anyone', {
    defaultMessage: 'Anyone',
  }),
  slackDailyLimitHelp: i18n.translate('xpack.nightshift.automations.flyout.slackDailyLimitHelp', {
    defaultMessage:
      'When reached, Nightshift replies in Slack that the automation is paused. Resets daily at 12:00 AM UTC.',
  }),
  empty: i18n.translate('xpack.nightshift.automations.flyout.triggersEmpty', {
    defaultMessage: 'Choose what starts this automation.',
  }),
  addTrigger: i18n.translate('xpack.nightshift.automations.addTriggerButton', {
    defaultMessage: 'Add trigger',
  }),
  searchTriggers: i18n.translate('xpack.nightshift.automations.flyout.searchTriggers', {
    defaultMessage: 'Search triggers…',
  }),
  noTriggers: i18n.translate('xpack.nightshift.automations.flyout.noTriggers', {
    defaultMessage: 'No triggers match your search',
  }),
  elastic: i18n.translate('xpack.nightshift.automations.flyout.elasticGroup', {
    defaultMessage: 'Elastic',
  }),
  slack: i18n.translate('xpack.nightshift.automations.flyout.slackGroup', {
    defaultMessage: 'Slack',
  }),
  every: i18n.translate('xpack.nightshift.automations.flyout.everyOption', {
    defaultMessage: 'Every…',
  }),
  customCron: i18n.translate('xpack.nightshift.automations.flyout.customCronOption', {
    defaultMessage: 'Custom cron…',
  }),
  whenAnAlert: i18n.translate('xpack.nightshift.automations.flyout.whenAnAlert', {
    defaultMessage: 'When an alert',
  }),
  from: i18n.translate('xpack.nightshift.automations.flyout.from', { defaultMessage: 'from' }),
  changesTo: i18n.translate('xpack.nightshift.automations.flyout.changesTo', {
    defaultMessage: 'changes to',
  }),
  anyRule: i18n.translate('xpack.nightshift.automations.flyout.anyRule', {
    defaultMessage: 'Any rule',
  }),
  ruleName: i18n.translate('xpack.nightshift.automations.ruleNamePatternLabel', {
    defaultMessage: 'Rule name pattern',
  }),
  ruleNameHelp: i18n.translate('xpack.nightshift.automations.ruleNamePatternHelp', {
    defaultMessage: 'Matches rule names that contain this text.',
  }),
  tags: i18n.translate('xpack.nightshift.automations.tagsLabel', { defaultMessage: 'Tags' }),
  anyStatus: i18n.translate('xpack.nightshift.automations.anyStatusOption', {
    defaultMessage: 'Any status',
  }),
  active: i18n.translate('xpack.nightshift.automations.activeOption', { defaultMessage: 'Active' }),
  activeHelp: i18n.translate('xpack.nightshift.automations.flyout.activeHelp', {
    defaultMessage: 'Rule conditions are currently met',
  }),
  recovered: i18n.translate('xpack.nightshift.automations.recoveredOption', {
    defaultMessage: 'Recovered',
  }),
  recoveredHelp: i18n.translate('xpack.nightshift.automations.flyout.recoveredHelp', {
    defaultMessage: 'Rule conditions are no longer met',
  }),
  everyLead: i18n.translate('xpack.nightshift.automations.flyout.everyLead', {
    defaultMessage: 'Every',
  }),
  scheduleUnit: i18n.translate('xpack.nightshift.automations.flyout.scheduleUnit', {
    defaultMessage: 'Schedule unit',
  }),
  hour: i18n.translate('xpack.nightshift.automations.flyout.hour', { defaultMessage: 'Hour' }),
  day: i18n.translate('xpack.nightshift.automations.flyout.day', { defaultMessage: 'Day' }),
  week: i18n.translate('xpack.nightshift.automations.flyout.week', { defaultMessage: 'Week' }),
  at: i18n.translate('xpack.nightshift.automations.flyout.at', { defaultMessage: 'at' }),
  on: i18n.translate('xpack.nightshift.automations.flyout.on', { defaultMessage: 'on' }),
  and: i18n.translate('xpack.nightshift.automations.flyout.and', { defaultMessage: 'and' }),
  betweenHours: i18n.translate('xpack.nightshift.automations.flyout.betweenHours', {
    defaultMessage: 'between hours',
  }),
  time: i18n.translate('xpack.nightshift.automations.flyout.time', { defaultMessage: 'Time' }),
  startTime: i18n.translate('xpack.nightshift.automations.flyout.startTime', {
    defaultMessage: 'Start time',
  }),
  endTime: i18n.translate('xpack.nightshift.automations.flyout.endTime', {
    defaultMessage: 'End time',
  }),
  daysOfWeek: i18n.translate('xpack.nightshift.automations.flyout.daysOfWeek', {
    defaultMessage: 'Days of week',
  }),
  timezone: i18n.translate('xpack.nightshift.automations.flyout.timezone', {
    defaultMessage: 'Timezone',
  }),
  timezonePlaceholder: i18n.translate('xpack.nightshift.automations.flyout.timezonePlaceholder', {
    defaultMessage: 'City or timezone…',
  }),
  customCronLead: i18n.translate('xpack.nightshift.automations.flyout.customCronLead', {
    defaultMessage: 'Custom cron',
  }),
  dailyLimit: i18n.translate('xpack.nightshift.automations.dailyLimitLabel', {
    defaultMessage: 'Daily trigger limit',
  }),
  perDay: i18n.translate('xpack.nightshift.automations.perDayAppend', {
    defaultMessage: 'per day',
  }),
  recommended: i18n.translate('xpack.nightshift.automations.flyout.recommendedLimit', {
    defaultMessage: 'Recommended: 15–20',
  }),
  dailyLimitHelp: i18n.translate('xpack.nightshift.automations.flyout.dailyLimitHelp', {
    defaultMessage: 'When reached, additional triggers are skipped. Resets daily at 12:00 AM UTC.',
  }),
};

export const slackTriggerLeads: Record<SlackTriggerKind, string> = {
  slack_message: i18n.translate('xpack.nightshift.automations.flyout.slackMessageLead', {
    defaultMessage: 'New message',
  }),
};
