/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { ServiceAccountField } from '../watches/components/service_account_field';
import * as i18n from './translations';

interface Props {
  serviceAccountId?: string;
  isDisabled: boolean;
  onChange: (serviceAccountId: string | undefined) => void;
}

export const OnboardingRunAsRow: React.FC<Props> = ({ serviceAccountId, isDisabled, onChange }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="l"
      responsive={false}
      css={css`
        padding: ${euiTheme.size.l};
      `}
      data-test-subj="alertZeroOnboardingServiceAccount"
    >
      <EuiFlexItem>
        <EuiText size="s">
          <strong>{i18n.SERVICE_ACCOUNT_LABEL}</strong>
        </EuiText>
        <EuiText size="s" color="subdued">
          <p>{i18n.SERVICE_ACCOUNT_DESCRIPTION}</p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false} css={{ minWidth: 280 }}>
        <ServiceAccountField
          workerId="onboarding"
          workerName={i18n.SERVICE_ACCOUNT_LABEL}
          ariaLabel={i18n.SERVICE_ACCOUNT_LABEL}
          current={serviceAccountId}
          isDisabled={isDisabled}
          onChange={(nextId) => onChange(nextId ?? undefined)}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
