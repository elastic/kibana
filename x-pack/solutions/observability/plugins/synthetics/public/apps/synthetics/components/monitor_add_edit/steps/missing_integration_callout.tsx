/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButton, EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useMonitorIntegrationHealth } from '../../common/hooks/use_monitor_integration_health';
import { getStatusLabel } from '../../common/hooks/status_labels';

export const MissingIntegrationCallout = ({ configId }: { configId: string }) => {
  const { hasMissingIntegrations, getMissingStatuses, resetMonitor, isResetting } =
    useMonitorIntegrationHealth({
      configIds: [configId],
    });

  const [resetSuccess, setResetSuccess] = useState(false);

  const isMissing = hasMissingIntegrations(configId);
  const missingStatuses = getMissingStatuses(configId);

  const handleReset = useCallback(async () => {
    await resetMonitor(configId);
    setResetSuccess(true);
  }, [resetMonitor, configId]);

  if (!isMissing && !resetSuccess) {
    return null;
  }

  if (resetSuccess) {
    return (
      <>
        <EuiCallOut
          title={RESET_SUCCESS_TITLE}
          color="success"
          iconType="check"
          data-test-subj="syntheticsMissingIntegrationResetSuccess"
        >
          <p>{RESET_SUCCESS_DESCRIPTION}</p>
        </EuiCallOut>
        <EuiSpacer size="m" />
      </>
    );
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
        <EuiSpacer size="s" />
        <EuiButton
          data-test-subj="syntheticsMissingIntegrationResetButton"
          color="warning"
          onClick={handleReset}
          isLoading={isResetting}
        >
          {RESET_BUTTON_LABEL}
        </EuiButton>
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

const RESET_SUCCESS_TITLE = i18n.translate('xpack.synthetics.missingIntegration.resetSuccess', {
  defaultMessage: 'Monitor reset successfully',
});

const RESET_SUCCESS_DESCRIPTION = i18n.translate(
  'xpack.synthetics.missingIntegration.resetSuccess.description',
  {
    defaultMessage:
      'The Fleet integration has been recreated. The monitor should start running again shortly.',
  }
);
