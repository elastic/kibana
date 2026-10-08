/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  getDetectionPausedCalloutBody,
  getDetectionPausedCalloutTitle,
  type SignificantEventsMaintenanceStatus,
} from '@kbn/significant-events-plugin/common';
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

  return (
    <EuiCallOut
      announceOnMount
      color="warning"
      iconType="pause"
      data-test-subj="significantEventsPausedBanner"
      title={getDetectionPausedCalloutTitle(status)}
    >
      <p>{getDetectionPausedCalloutBody({ status, canManageAndConfigure })}</p>
      {failureCount > 0 && (
        <p>
          {i18n.translate('xpack.significantEventsApp.pausedBannerPartialFailures', {
            defaultMessage:
              'Some maintenance operations could not be completed. Check Settings and the Kibana server logs for details.',
          })}
        </p>
      )}
      {canManageAndConfigure && settingsHref && (
        <EuiButton
          href={settingsHref}
          color="warning"
          size="s"
          data-test-subj="significantEventsPausedBannerSettingsLink"
        >
          {i18n.translate('xpack.significantEventsApp.pausedBannerSettingsButton', {
            defaultMessage: 'Open settings',
          })}
        </EuiButton>
      )}
    </EuiCallOut>
  );
};
