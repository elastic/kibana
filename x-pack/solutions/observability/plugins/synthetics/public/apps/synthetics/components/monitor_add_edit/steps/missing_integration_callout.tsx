/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButton, EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useMonitorIntegrationHealth } from '../../common/hooks/use_monitor_integration_health';
import { getStatusLabel } from '../../common/hooks/status_labels';
import { kibanaService } from '../../../../../utils/kibana_service';

export const MissingIntegrationCallout = ({ configId }: { configId: string }) => {
  const {
    isUnhealthy: hasMissingIntegrations,
    isFixableByReset,
    getUnhealthyLocationStatuses: getMissingStatuses,
    resetMonitor,
    isResetting,
  } = useMonitorIntegrationHealth({
    configIds: [configId],
  });

  const isMissing = hasMissingIntegrations(configId);
  const canReset = isFixableByReset(configId);
  const missingStatuses = getMissingStatuses(configId);

  const handleReset = useCallback(async () => {
    const { error } = await resetMonitor(configId);
    if (error) {
      kibanaService.toasts.addDanger({
        title: RESET_ERROR_TITLE,
        toastLifeTimeMs: 5000,
      });
    } else {
      kibanaService.toasts.addSuccess({
        title: RESET_SUCCESS_TITLE,
        toastLifeTimeMs: 3000,
      });
    }
  }, [resetMonitor, configId]);

  if (!isMissing) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        title={CALLOUT_TITLE}
        color="warning"
        iconType="warning"
        data-test-subj="syntheticsMissingIntegrationCallout"
      >
        {missingStatuses.length > 0 && (
          <EuiText size="s">
            <ul>
              {missingStatuses.map((s) => {
                const label = getStatusLabel(s.status);
                return (
                  <li key={s.locationId}>
                    <strong>{s.locationLabel}</strong>
                    {label ? `: ${label}` : ''}
                  </li>
                );
              })}
            </ul>
          </EuiText>
        )}
        {canReset && (
          <>
            <EuiSpacer size="s" />
            <EuiButton
              data-test-subj="syntheticsMissingIntegrationResetButton"
              color="warning"
              onClick={handleReset}
              isLoading={isResetting}
            >
              {RESET_BUTTON_LABEL}
            </EuiButton>
          </>
        )}
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};

const CALLOUT_TITLE = i18n.translate('xpack.synthetics.missingIntegration.callout.title', {
  defaultMessage: 'Missing Fleet integration',
});

const RESET_BUTTON_LABEL = i18n.translate('xpack.synthetics.missingIntegration.resetButton', {
  defaultMessage: 'Reset monitor',
});

const RESET_ERROR_TITLE = i18n.translate('xpack.synthetics.missingIntegration.resetError', {
  defaultMessage: 'Failed to reset monitor',
});

const RESET_SUCCESS_TITLE = i18n.translate('xpack.synthetics.missingIntegration.resetSuccess', {
  defaultMessage: 'Monitor reset successfully',
});
