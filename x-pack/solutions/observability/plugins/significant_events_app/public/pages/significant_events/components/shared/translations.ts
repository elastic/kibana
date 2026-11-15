/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SignificantEventStatus } from '@kbn/significant-events-schema';

export const FIND_SIGNIFICANT_EVENTS_LABEL = i18n.translate(
  'xpack.significantEventsApp.findSignificantEventsLabel',
  {
    defaultMessage: 'Find significant events',
  }
);

/** Tooltip for controls disabled while Significant Events activity is paused. */
export const ACTIVITY_PAUSED_TOOLTIP = i18n.translate(
  'xpack.significantEventsApp.activityPausedTooltip',
  {
    defaultMessage: 'Significant events activity is paused. Resume it in settings.',
  }
);

/** Tooltip while maintenance status is still loading. */
export const ACTIVITY_STATUS_LOADING_TOOLTIP = i18n.translate(
  'xpack.significantEventsApp.activityStatusLoadingTooltip',
  {
    defaultMessage: 'Checking significant events activity status…',
  }
);

/** Tooltip when maintenance status could not be loaded. */
export const ACTIVITY_STATUS_ERROR_TOOLTIP = i18n.translate(
  'xpack.significantEventsApp.activityStatusErrorTooltip',
  {
    defaultMessage:
      'Could not load significant events activity status. New activity stays blocked until status is available.',
  }
);

/** Tooltip explaining why activity controls are disabled (loading, error, or paused). */
export const getActivityBlockTooltip = ({
  isLoading,
  isError,
  isBlocked,
}: {
  isLoading: boolean;
  isError: boolean;
  isBlocked: boolean;
}): string | undefined => {
  if (isLoading) {
    return ACTIVITY_STATUS_LOADING_TOOLTIP;
  }
  if (isError) {
    return ACTIVITY_STATUS_ERROR_TOOLTIP;
  }
  if (isBlocked) {
    return ACTIVITY_PAUSED_TOOLTIP;
  }
  return undefined;
};

export const CANCEL_DISCOVERY_LABEL = i18n.translate(
  'xpack.significantEventsApp.cancelDiscoveryLabel',
  {
    defaultMessage: 'Cancel',
  }
);

export const CHANGE_TYPE_LABELS: Record<string, string> = {
  dip: i18n.translate('xpack.significantEventsApp.changeType.dip', {
    defaultMessage: 'Dip',
  }),
  distribution_change: i18n.translate('xpack.significantEventsApp.changeType.distributionChange', {
    defaultMessage: 'Distribution change',
  }),
  non_stationary: i18n.translate('xpack.significantEventsApp.changeType.nonStationary', {
    defaultMessage: 'Non-stationary',
  }),
  spike: i18n.translate('xpack.significantEventsApp.changeType.spike', {
    defaultMessage: 'Spike',
  }),
  stationary: i18n.translate('xpack.significantEventsApp.changeType.stationary', {
    defaultMessage: 'Stationary',
  }),
  step_change: i18n.translate('xpack.significantEventsApp.changeType.stepChange', {
    defaultMessage: 'Step change',
  }),
  trend_change: i18n.translate('xpack.significantEventsApp.changeType.trendChange', {
    defaultMessage: 'Trend change',
  }),
};

export const changeTypeLabel = (type?: string): string =>
  (type ? CHANGE_TYPE_LABELS[type] : undefined) ?? type ?? '-';

export const SIGNIFICANT_EVENT_STATUS_LABELS: Record<SignificantEventStatus, string> = {
  active: i18n.translate('xpack.significantEventsApp.significantEvent.status.active', {
    defaultMessage: 'Active',
  }),
  recovering: i18n.translate('xpack.significantEventsApp.significantEvent.status.recovering', {
    defaultMessage: 'Recovering',
  }),
  inactive: i18n.translate('xpack.significantEventsApp.significantEvent.status.inactive', {
    defaultMessage: 'Inactive',
  }),
};
