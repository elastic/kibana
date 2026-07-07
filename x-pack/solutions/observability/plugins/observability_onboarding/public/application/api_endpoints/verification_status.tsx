/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export type ClientVerificationStatus = 'waiting' | 'accepted' | 'expired';

export interface VerificationStatusProps {
  status: ClientVerificationStatus;
  detectionActive: boolean;
  endpointLabel: string;
}

export const VerificationStatus: React.FC<VerificationStatusProps> = ({
  status,
  detectionActive,
  endpointLabel,
}) => {
  if (status === 'accepted') {
    return (
      <EuiText
        size="s"
        color="success"
        role="status"
        aria-live="polite"
        data-test-subj="obltOnboardingVerificationAccepted"
      >
        {i18n.translate('xpack.observability_onboarding.apiEndpoints.verification.accepted', {
          defaultMessage: 'Data accepted by the {endpointLabel} endpoint.',
          values: { endpointLabel },
        })}
      </EuiText>
    );
  }

  if (status === 'expired') {
    return (
      <EuiText
        size="s"
        color="subdued"
        role="status"
        aria-live="polite"
        data-test-subj="obltOnboardingVerificationExpired"
      >
        {i18n.translate('xpack.observability_onboarding.apiEndpoints.verification.expired', {
          defaultMessage:
            'No data received yet. Check that your sender is using this endpoint and API key.',
        })}
      </EuiText>
    );
  }

  if (!detectionActive) {
    return (
      <EuiText
        size="s"
        color="subdued"
        role="status"
        aria-live="polite"
        data-test-subj="obltOnboardingVerificationUnavailable"
      >
        {i18n.translate('xpack.observability_onboarding.apiEndpoints.verification.unavailable', {
          defaultMessage:
            'Your API key is ready. Automatic delivery confirmation is not available for this endpoint.',
        })}
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      responsive={false}
      role="status"
      aria-live="polite"
      data-test-subj="obltOnboardingVerificationWaiting"
    >
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size="m" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.observability_onboarding.apiEndpoints.verification.waiting', {
            defaultMessage: 'Waiting for data from this API key...',
          })}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
