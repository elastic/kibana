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
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import React from 'react';
import headerIllustrationUrl from './header_illustration.png';

export function Header() {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPageTemplate.Section
      paddingSize="xl"
      css={css`
        border-bottom: ${euiTheme.border.thin};
        overflow: hidden;
        & > div {
          position: relative;
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
              defaultMessage="Connect your systems and get full visibility into logs, metrics, and traces."
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      {/*
       * bottom: -32px cancels the section's xl bottom padding so the image
       * bottom sits exactly at the section's border (= the divider).
       * overflow: hidden on the section clips everything below that line.
       */}
      <img
        src={headerIllustrationUrl}
        alt=""
        aria-hidden="true"
        css={css`
          position: absolute;
          height: 130%;
          width: auto;
          right: 140px;
          bottom: -60px;
        `}
      />
    </EuiPageTemplate.Section>
  );
}
