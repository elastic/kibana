/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  getDetectionPausedCalloutBody,
  getDetectionPausedCalloutTitle,
  type SignificantEventsMaintenanceStatus,
} from '@kbn/significant-events-plugin/common';
import { KbnWarningCallout } from '@kbn/ui-callout';
import React from 'react';

export const PausedActivityCallout = ({
  status,
  canManageAndConfigure,
  settingsHref,
}: {
  status: SignificantEventsMaintenanceStatus;
  canManageAndConfigure: boolean;
  settingsHref?: string;
}) => {
  const failureCount = status.lastSummary?.partialFailures.length ?? 0;
  const description = getDetectionPausedCalloutBody({ status, canManageAndConfigure });
  const partialFailuresDescription =
    failureCount > 0
      ? i18n.translate('xpack.significantEventsApp.pausedBannerPartialFailures', {
          defaultMessage:
            'Some maintenance operations could not be completed. Check Settings and the Kibana server logs for details.',
        })
      : undefined;

  return (
    <KbnWarningCallout
      announceOnMount
      size="s"
      data-test-subj="significantEventsPausedBanner"
      title={getDetectionPausedCalloutTitle(status)}
      text={
        partialFailuresDescription
          ? `${description} ${partialFailuresDescription}`
          : description
      }
      actionProps={
        canManageAndConfigure && settingsHref
          ? {
              primary: {
                children: i18n.translate('xpack.significantEventsApp.pausedBannerSettingsButton', {
                  defaultMessage: 'Open settings',
                }),
                href: settingsHref,
                'data-test-subj': 'significantEventsPausedBannerSettingsLink',
              },
            }
          : undefined
      }
    />
  );
};
