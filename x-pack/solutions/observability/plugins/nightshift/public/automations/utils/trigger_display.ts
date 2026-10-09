/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SlackTriggerKind } from '../flyouts/form/automation_form_values';
import type { Automation } from '../hooks/use_automations';

export const triggerTypeLabels = {
  alertTriggered: i18n.translate('xpack.nightshift.automations.flyout.alertTriggered', {
    defaultMessage: 'Alert triggered',
  }),
  scheduled: i18n.translate('xpack.nightshift.automations.flyout.scheduledGroup', {
    defaultMessage: 'Scheduled',
  }),
};

export const slackTriggerLabels: Record<SlackTriggerKind, string> = {
  slack_message: i18n.translate('xpack.nightshift.automations.flyout.slackMessageTrigger', {
    defaultMessage: 'New message in channel',
  }),
};

export const TRIGGER_LABEL_ORDER = [
  triggerTypeLabels.alertTriggered,
  ...Object.values(slackTriggerLabels),
  triggerTypeLabels.scheduled,
];

const SLACK_EVENT_KINDS = {
  message: 'slack_message',
} as const;

export const getTriggerDisplay = (
  row: Automation['trigger']['rows'][number]
): { label: string; icon: string } => {
  if (row.kind === 'slack') {
    return { label: slackTriggerLabels[SLACK_EVENT_KINDS[row.event]], icon: 'logoSlack' };
  }
  if (row.kind === 'schedule') {
    return { label: triggerTypeLabels.scheduled, icon: 'calendar' };
  }
  return { label: triggerTypeLabels.alertTriggered, icon: 'logoElastic' };
};

export const getTriggerIcon = (label: string): string => {
  if (label === triggerTypeLabels.alertTriggered) return 'logoElastic';
  if (label === triggerTypeLabels.scheduled) return 'calendar';
  return 'logoSlack';
};
