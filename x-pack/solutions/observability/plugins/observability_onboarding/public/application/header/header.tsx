/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiPageTemplate,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import React from 'react';
import backgroundImageUrl from './background.svg';

export function Header() {
  return (
    <EuiPageTemplate.Section
      paddingSize="xl"
      css={css`
        & > div {
          background-image: url(${backgroundImageUrl});
          background-position: right center;
          background-repeat: no-repeat;
        }
      `}
      grow={false}
      restrictWidth
    >
      <EuiSpacer size="xl" />
      <EuiFlexGroup>
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
              id="xpack.observability_onboarding.experimentalOnboardingFlow.startIngestingDataIntoTextLabel"
              defaultMessage="Start ingesting Observability data into Elastic. Return to this page at any time by clicking Add data."
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem />
      </EuiFlexGroup>
    </EuiPageTemplate.Section>
  );
}
