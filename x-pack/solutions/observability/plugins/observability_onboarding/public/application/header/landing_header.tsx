/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHideFor,
  EuiImage,
  EuiPageTemplate,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import imageUrl from './background.svg';

export const LandingHeader = (): JSX.Element => {
  return (
    <EuiPageTemplate.Section paddingSize="xl" grow={false} restrictWidth>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiTitle size="l" data-test-subj="obltOnboardingHomeTitle">
            <h1>
              <FormattedMessage
                id="xpack.observability_onboarding.experimentalOnboardingFlow.addObservabilityDataTitleLabel"
                defaultMessage="Add Observability data"
              />
            </h1>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText color="subdued">
            <FormattedMessage
              id="xpack.observability_onboarding.addDataPageV2.subtitle"
              defaultMessage="Connect your systems and get full visibility into logs, metrics, and traces."
            />
          </EuiText>
        </EuiFlexItem>
        <EuiHideFor sizes={['xs', 's']}>
          <EuiFlexItem grow={false}>
            <EuiImage src={imageUrl} alt="" size="l" />
          </EuiFlexItem>
        </EuiHideFor>
      </EuiFlexGroup>
    </EuiPageTemplate.Section>
  );
};
