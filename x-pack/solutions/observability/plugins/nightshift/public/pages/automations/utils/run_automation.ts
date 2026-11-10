/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isRunQuotaReached, type RunQuotasResponse } from '@kbn/significant-events-plugin/common';
import { isScheduleOnlyAutomation } from '@kbn/nightshift-investigations-plugin/common';
import type { Automation } from '../../../data/automations/use_automations';

export const RUN_AUTOMATION_LABEL = i18n.translate('xpack.nightshift.automations.runButtonLabel', {
  defaultMessage: 'Run',
});

export const getRunAutomationDisabledReason = (
  automation: Automation,
  activity: { data?: { isRunning: boolean }; isInitialLoading?: boolean; isError?: boolean } = {}
): string | undefined => {
  if (
    automation.backingWorkflow?.state === 'missing' ||
    automation.backingWorkflow?.state === 'out_of_sync'
  ) {
    return i18n.translate('xpack.nightshift.automations.runNeedsRepair', {
      defaultMessage: 'Repair the backing workflow before running this automation.',
    });
  }
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
  if ((automation.runtime.overlapPolicy ?? 'drop') !== 'drop') return;
  if (activity.data?.isRunning) {
    return i18n.translate('xpack.nightshift.automations.runAlreadyRunningTooltip', {
      defaultMessage:
        'This automation is already running. Wait for it to finish before running it again.',
    });
  }
  if (activity.isInitialLoading) {
    return i18n.translate('xpack.nightshift.automations.runCheckingActivityTooltip', {
      defaultMessage: 'Checking whether this automation is already running.',
    });
  }
  if (activity.isError) {
    return i18n.translate('xpack.nightshift.automations.runActivityUnavailableTooltip', {
      defaultMessage:
        'Unable to check whether this automation is already running. Try again shortly.',
    });
  }
};

export const getManualRunQuotaDisabledReason = ({
  data: quotas,
  isInitialLoading,
  isError,
}: {
  data?: RunQuotasResponse;
  isInitialLoading?: boolean;
  isError?: boolean;
}): string | undefined => {
  if (quotas) {
    const group = (['total_investigation', 'manual_investigation'] as const).find((candidate) =>
      isRunQuotaReached({
        group: candidate,
        enabled: quotas.enabled,
        investigationLimitsEnabled: quotas.investigationLimitsEnabled,
        limit: quotas.limits[candidate],
        count: quotas.counts[candidate],
      })
    );
    if (group) {
      const resetTime = new Intl.DateTimeFormat(i18n.getLocale(), {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: quotas.window.timezone,
        timeZoneName: 'short',
      }).format(new Date(quotas.window.resetsAt));
      return group === 'total_investigation'
        ? i18n.translate('xpack.nightshift.automations.runTotalQuotaReachedTooltip', {
            defaultMessage:
              'The daily total investigation limit has been reached. Try again after {resetTime}.',
            values: { resetTime },
          })
        : i18n.translate('xpack.nightshift.automations.runManualQuotaReachedTooltip', {
            defaultMessage:
              'The daily manual investigation limit has been reached. Try again after {resetTime}.',
            values: { resetTime },
          });
    }
  }
  if (isInitialLoading) {
    return i18n.translate('xpack.nightshift.automations.runCheckingQuotaTooltip', {
      defaultMessage: 'Checking the daily investigation limits.',
    });
  }
  if (isError) {
    return i18n.translate('xpack.nightshift.automations.runQuotaUnavailableTooltip', {
      defaultMessage: 'Unable to check the daily investigation limits. Try again shortly.',
    });
  }
};
