/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { MAINTENANCE_FEATURE_FLAG_ACTOR } from './actors';
import type { SignificantEventsMaintenanceStatus } from './types';

export function isPausedByFeatureFlag(status: SignificantEventsMaintenanceStatus): boolean {
  return status.updatedBy === MAINTENANCE_FEATURE_FLAG_ACTOR;
}

/** Shared title for the paused-detection warning callout across Nightshift UIs. */
export function getPausedDetectionCalloutTitle(
  status: SignificantEventsMaintenanceStatus
): string {
  const { updatedBy } = status;
  const pausedByFeatureFlag = isPausedByFeatureFlag(status);

  if (updatedBy && !pausedByFeatureFlag) {
    return i18n.translate('xpack.significantEvents.maintenance.pausedCalloutTitleWithActor', {
      defaultMessage: 'Detection is paused by {pausedBy}.',
      values: { pausedBy: updatedBy },
    });
  }

  return i18n.translate('xpack.significantEvents.maintenance.pausedCalloutTitle', {
    defaultMessage: 'Detection is paused',
  });
}

export function getPausedDetectionCalloutBody(): string {
  return i18n.translate('xpack.significantEvents.maintenance.pausedCalloutBody', {
    defaultMessage:
      'Detection activity is stopped across the deployment: scheduled discovery, detections and the alerting rules backing knowledge indicator queries. Manual triggers are blocked until you resume from Settings.',
  });
}
