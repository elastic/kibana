/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCopy } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { openWiredConnectionDetails } from '@kbn/cloud/connection_details';
import { useKibana } from '../services';

interface OnboardingApiKeysProps {
  apiKey: string | null | undefined;
  isLoading: boolean;
}

export const OnboardingApiKeys = ({ apiKey, isLoading }: OnboardingApiKeysProps) => {
  const {
    services: { notifications },
  } = useKibana();

  if (apiKey) {
    return (
      <EuiCopy textToCopy={apiKey}>
        {(copy) => (
          <EuiButton
            fill
            iconType="key"
            isLoading={isLoading}
            onClick={copy}
            data-test-subj="vectordbPathSelectionCopyApiKey"
            data-telemetry-id="vectordbOnboarding-connectToProject-copyApiKey"
          >
            {i18n.translate('vectordbOnboarding.pathSelection.copyApiKey', {
              defaultMessage: 'Copy your API key',
            })}
          </EuiButton>
        )}
      </EuiCopy>
    );
  }

  return (
    <EuiButton
      fill
      iconType="key"
      onClick={() =>
        openWiredConnectionDetails({
          props: { options: { defaultTabId: 'apiKeys' } },
        }).catch((error) => {
          notifications.toasts.addDanger(
            error?.body?.message ??
              error?.message ??
              i18n.translate('vectordbOnboarding.pathSelection.unexpectedError', {
                defaultMessage: 'An unexpected error occurred',
              })
          );
        })
      }
      data-test-subj="vectordbPathSelectionGenerateApiKey"
      data-telemetry-id="vectordbOnboarding-connectToProject-generateApiKey"
    >
      {i18n.translate('vectordbOnboarding.pathSelection.generateApiKey', {
        defaultMessage: 'Generate API key',
      })}
    </EuiButton>
  );
};
