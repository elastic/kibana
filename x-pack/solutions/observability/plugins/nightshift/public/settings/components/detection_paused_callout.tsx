/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  getDetectionPausedCalloutBody,
  getDetectionPausedCalloutTitle,
} from '@kbn/significant-events-plugin/common';
import { KbnWarningCallout } from '@kbn/ui-callout';
import React from 'react';
import { useMaintenanceStatus } from '../hooks/use_significant_events_maintenance';

export const DetectionPausedCallout = ({
  canManageAndConfigure,
}: {
  canManageAndConfigure: boolean;
}) => {
  const { data: status } = useMaintenanceStatus();

  if (status?.state !== 'paused') {
    return null;
  }

  const failureCount = status.lastSummary?.partialFailures.length ?? 0;
  const description = getDetectionPausedCalloutBody({ status, canManageAndConfigure });
  const partialFailuresText =
    failureCount > 0
      ? i18n.translate('xpack.nightshift.settings.maintenance.partialFailuresCallout', {
          defaultMessage:
            'Some maintenance operations could not be completed. Check the Kibana server logs for details.',
        })
      : undefined;

  return (
    <>
      <KbnWarningCallout
        announceOnMount
        size="s"
        title={getDetectionPausedCalloutTitle(status)}
        data-test-subj="streams-settings-maintenance-paused-status"
        text={partialFailuresText ? `${description} ${partialFailuresText}` : description}
      />
      <EuiSpacer />
    </>
  );
};
