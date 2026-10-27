/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { MAINTENANCE_FEATURE_FLAG_ACTOR } from './actors';
import type { SignificantEventsMaintenanceStatus } from './types';

export const isPausedByFeatureFlag = (status: SignificantEventsMaintenanceStatus): boolean =>
  status.updatedBy === MAINTENANCE_FEATURE_FLAG_ACTOR;

export const getDetectionPausedCalloutTitle = (
  status: SignificantEventsMaintenanceStatus
): string => {
  if (isPausedByFeatureFlag(status)) {
    return i18n.translate('xpack.significantEvents.maintenance.pausedCallout.featureFlagTitle', {
      defaultMessage: 'Paused automatically because Nightshift was turned off',
    });
  }

  if (status.updatedBy) {
    return i18n.translate('xpack.significantEvents.maintenance.pausedCallout.userTitle', {
      defaultMessage: 'Detection is paused by {user}',
      values: { user: status.updatedBy },
    });
  }

  return i18n.translate('xpack.significantEvents.maintenance.pausedCallout.title', {
    defaultMessage: 'Detection is paused',
  });
};

const getDetectionPausedCalloutActivityScope = (): string =>
  i18n.translate('xpack.significantEvents.maintenance.pausedCallout.activityScope', {
    defaultMessage:
      'Nightshift activity is stopped in this space: scheduled discovery, continuous onboarding, detections, investigations, and the alerting rules backing knowledge indicator queries.',
  });

export const getDetectionPausedCalloutBody = ({
  status,
  canManageAndConfigure,
}: {
  status: SignificantEventsMaintenanceStatus;
  canManageAndConfigure: boolean;
}): string => {
  const activityScope = getDetectionPausedCalloutActivityScope();

  if (!canManageAndConfigure) {
    if (isPausedByFeatureFlag(status)) {
      return i18n.translate(
        'xpack.significantEvents.maintenance.pausedCallout.featureFlagReadOnlyBody',
        {
          defaultMessage:
            '{activityScope} Manual triggers are blocked. Turning Nightshift back on does not resume activity. An administrator with the Nightshift Manage engines privilege must resume activity from settings.',
          values: { activityScope },
        }
      );
    }

    return i18n.translate('xpack.significantEvents.maintenance.pausedCallout.readOnlyBody', {
      defaultMessage:
        '{activityScope} Manual triggers are blocked. An administrator with the Nightshift Manage engines privilege must resume activity from settings.',
      values: { activityScope },
    });
  }

  if (isPausedByFeatureFlag(status)) {
    return i18n.translate('xpack.significantEvents.maintenance.pausedCallout.featureFlagBody', {
      defaultMessage:
        '{activityScope} Manual triggers are blocked. Turning Nightshift back on does not resume activity. Resume from settings.',
      values: { activityScope },
    });
  }

  return i18n.translate('xpack.significantEvents.maintenance.pausedCallout.manageBody', {
    defaultMessage: '{activityScope} Manual triggers are blocked until you resume from settings.',
    values: { activityScope },
  });
};

export const getDetectionPausedSettingsCalloutBody = (
  status: SignificantEventsMaintenanceStatus
): string => {
  const activityScope = getDetectionPausedCalloutActivityScope();

  if (isPausedByFeatureFlag(status)) {
    return i18n.translate(
      'xpack.significantEvents.maintenance.pausedCallout.settingsFeatureFlagBody',
      {
        defaultMessage:
          '{activityScope} Manual triggers are blocked. Turning Nightshift back on does not resume activity.',
        values: { activityScope },
      }
    );
  }

  return i18n.translate('xpack.significantEvents.maintenance.pausedCallout.settingsBody', {
    defaultMessage: '{activityScope} Manual triggers are blocked.',
    values: { activityScope },
  });
};
