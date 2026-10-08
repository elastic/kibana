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
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import illustrationUrl from './hero_illustration.svg';

const ILLUSTRATION_WIDTH = 120;
const HEADER_CONTENT_MIN_HEIGHT = '140px';

export const LandingHeader = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPageTemplate.Header
      paddingSize="none"
      restrictWidth
      bottomBorder={false}
      css={css`
        padding: ${euiTheme.size.l} ${euiTheme.size.xl} 0;
      `}
    >
      <EuiFlexGroup
        alignItems="center"
        gutterSize="xl"
        css={css`
          min-height: ${HEADER_CONTENT_MIN_HEIGHT};
        `}
      >
        <EuiHideFor sizes={['xs', 's', 'm']}>
          <EuiFlexItem grow={false}>
            <EuiImage
              src={illustrationUrl}
              alt=""
              width={ILLUSTRATION_WIDTH}
              data-test-subj="obltOnboardingHomeIllustration"
            />
          </EuiFlexItem>
        </EuiHideFor>
        <EuiFlexItem grow={false}>
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
      </EuiFlexGroup>
    </EuiPageTemplate.Header>
  );
};
