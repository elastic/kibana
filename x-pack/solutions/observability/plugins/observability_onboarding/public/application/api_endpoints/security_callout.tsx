/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface Props {
  wasKeyCreatedBefore: boolean;
  hasApiKey: boolean;
  isDismissed: boolean;
  onDismiss: () => void;
}

export const SecurityCallout = ({
  wasKeyCreatedBefore,
  hasApiKey,
  isDismissed,
  onDismiss,
}: Props) => {
  if (!wasKeyCreatedBefore || hasApiKey || isDismissed) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="m" />
      <EuiCallOut
        announceOnMount
        iconType="info"
        onDismiss={onDismiss}
        title={i18n.translate('xpack.observability_onboarding.apiEndpoints.securityCalloutTitle', {
          defaultMessage: "Your existing keys can't be displayed",
        })}
        data-test-subj="observabilityOnboardingApiEndpointsSecurityCallout"
      >
        {i18n.translate('xpack.observability_onboarding.apiEndpoints.securityCalloutDescription', {
          defaultMessage:
            "For security, API keys are shown only once, right after you create them. If you already created a key and saved it, keep using it — you don't need a new one. Create a new key only if you've lost the previous one or need an additional key. Manage existing ones in API keys.",
        })}
      </EuiCallOut>
    </>
  );
};
