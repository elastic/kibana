/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiSwitch, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { HttpFetchOptions } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ObservabilityOnboardingContextValue } from '../..';

interface BetaIntegrationsToggleProps {
  /** Current state of the prerelease integrations setting */
  prereleaseIntegrationsEnabled: boolean;
  /** Callback when the setting changes */
  onToggle: (enabled: boolean) => void;
  /** Whether the toggle is disabled (e.g., while loading) */
  disabled?: boolean;
}

export const BetaIntegrationsToggle: React.FC<BetaIntegrationsToggleProps> = ({
  prereleaseIntegrationsEnabled,
  onToggle,
  disabled = false,
}) => {
  const {
    services: { http, fleet, notifications },
  } = useKibana<ObservabilityOnboardingContextValue>();

  const [isUpdating, setIsUpdating] = useState(false);
  const [localChecked, setLocalChecked] = useState<boolean | undefined>(undefined);

  // Check if user has permission to update Fleet settings
  const canUpdateSettings = fleet?.authz?.fleet?.allSettings ?? false;

  const handleToggle = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.checked;

      if (!http) return;

      try {
        setIsUpdating(true);
        setLocalChecked(newValue);

        const options: HttpFetchOptions = {
          headers: { 'Elastic-Api-Version': '2023-10-31' },
          body: JSON.stringify({
            prerelease_integrations_enabled: newValue,
          }),
        };

        await http.put('/api/fleet/settings', options);
        onToggle(newValue);
      } catch (error) {
        // Revert local state on error
        setLocalChecked(!newValue);
        notifications?.toasts?.addError(error as Error, {
          title: i18n.translate(
            'xpack.observability_onboarding.betaIntegrationsToggle.errorUpdatingSettings',
            {
              defaultMessage: 'Error updating beta integrations setting',
            }
          ),
        });
      } finally {
        setIsUpdating(false);
      }
    },
    [http, notifications, onToggle]
  );

  // Don't render if user doesn't have permission
  if (!canUpdateSettings) {
    return null;
  }

  const currentValue = localChecked ?? prereleaseIntegrationsEnabled;

  return (
    <EuiToolTip
      content={i18n.translate(
        'xpack.observability_onboarding.betaIntegrationsToggle.tooltip',
        {
          defaultMessage:
            'Beta integrations are not recommended for production environments. This setting also applies to Fleet Integrations.',
        }
      )}
    >
      <EuiSwitch
        label={i18n.translate(
          'xpack.observability_onboarding.betaIntegrationsToggle.label',
          {
            defaultMessage: 'Display beta integrations',
          }
        )}
        checked={currentValue}
        onChange={handleToggle}
        disabled={disabled || isUpdating}
        compressed
        data-test-subj="observabilityOnboardingBetaIntegrationsToggle"
      />
    </EuiToolTip>
  );
};
