/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isScheduleOnlyAutomation } from '@kbn/nightshift-investigations-plugin/common';
import type { Automation } from '../../../data/automations/use_automations';

export const RUN_AUTOMATION_LABEL = i18n.translate('xpack.nightshift.automations.runButtonLabel', {
  defaultMessage: 'Run',
});

export const getRunAutomationDisabledReason = (automation: Automation): string | undefined => {
  if (!automation.isEnabled) {
    return i18n.translate('xpack.nightshift.automations.runDisabledAutomationTooltip', {
      defaultMessage: 'This automation is disabled. Enable it to run on a schedule or manually.',
    });
  }
  if (!isScheduleOnlyAutomation(automation)) {
    return i18n.translate('xpack.nightshift.automations.runUnsupportedTriggerTooltip', {
      defaultMessage:
        'Only automations with a schedule trigger and no other triggers can be run manually.',
    });
  }
};
