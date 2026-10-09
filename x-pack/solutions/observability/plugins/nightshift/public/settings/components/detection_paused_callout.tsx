/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  getDetectionPausedCalloutTitle,
  isPausedByFeatureFlag,
} from '@kbn/significant-events-plugin/common';
import { KbnWarningCallout } from '@kbn/ui-callout';
import React from 'react';
import { useMaintenanceStatus } from '../hooks/use_significant_events_maintenance';

export const DetectionPausedCallout = () => {
  const { data: status } = useMaintenanceStatus();

  if (status?.state !== 'paused') {
    return null;
  }

  const failureCount = status.lastSummary?.partialFailures.length ?? 0;
  const automaticPause = isPausedByFeatureFlag(status);
  const title = automaticPause
    ? getDetectionPausedCalloutTitle(status)
    : status.updatedBy
    ? i18n.translate('xpack.nightshift.settings.maintenance.userPausedCalloutTitle', {
        defaultMessage: 'Detection process is paused by {user}',
        values: { user: status.updatedBy },
      })
    : i18n.translate('xpack.nightshift.settings.maintenance.pausedCalloutTitle', {
        defaultMessage: 'Detection process is paused',
      });
  const disabledCounts = status.lastSummary
    ? i18n.translate('xpack.nightshift.settings.maintenance.pausedCalloutDisabledCounts', {
        defaultMessage:
          '{rulesDisabled, plural, one {# rule} other {# rules}} and {automationsDisabled, plural, one {# automation} other {# automations}} disabled.',
        values: {
          rulesDisabled: status.lastSummary.rulesDisabled,
          automationsDisabled: status.lastSummary.workflowsDisabled,
        },
      })
    : undefined;
  const partialFailures = failureCount > 0 && (
    <p data-test-subj="streams-settings-maintenance-partial-failures">
      {i18n.translate('xpack.nightshift.settings.maintenance.partialFailuresCallout', {
        defaultMessage:
          'Some maintenance operations could not be completed. Check the Kibana server logs for details.',
      })}
    </p>
  );

  return (
    <>
      <KbnWarningCallout
        announceOnMount
        size="s"
        title={disabledCounts ? `${title} · ${disabledCounts}` : title}
        data-test-subj="streams-settings-maintenance-paused-status"
        text={partialFailures || undefined}
      />
      <EuiSpacer />
    </>
  );
};
