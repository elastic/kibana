/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiSteps,
  useEuiTheme,
  type EuiStepsProps,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { SupportedLogo } from './logo_icon';
import { OnboardingFlowHeader } from './onboarding_flow_header';

export type HostOs = 'linux' | 'mac' | 'windows';

interface HostOsLayoutProps {
  os: HostOs;
  title: string;
  subtitle: string;
  logo: SupportedLogo;
  banners?: React.ReactNode;
  steps: EuiStepsProps['steps'];
  feedback?: React.ReactNode;
}

export const HostOsLayout: React.FC<HostOsLayoutProps> = ({
  os,
  title,
  subtitle,
  logo,
  banners,
  steps,
  feedback,
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPageTemplate paddingSize="none">
      <OnboardingFlowHeader
        title={title}
        subtitle={subtitle}
        logo={logo}
        returnTo="/"
        returnDataTestSubj="observabilityOnboardingHostV2Return"
      />
      <EuiPageTemplate.Section paddingSize="xl" restrictWidth>
        <div data-test-subj={`observabilityOnboardingHostV2Layout-${os}`}>
          <EuiFlexGroup direction="column" gutterSize="m">
            {banners && <EuiFlexItem grow={false}>{banners}</EuiFlexItem>}

            <EuiFlexItem
              grow={false}
              css={css`
                padding-left: ${euiTheme.size.base};
              `}
            >
              <EuiSteps steps={steps} />
            </EuiFlexItem>

            {feedback && <EuiFlexItem grow={false}>{feedback}</EuiFlexItem>}
          </EuiFlexGroup>
        </div>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
