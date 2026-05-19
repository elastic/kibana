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
import type { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import { css } from '@emotion/react';
import type { SupportedLogo } from '../logo_icon';
import { OnboardingFlowHeader } from '../onboarding_flow_header';

export interface OnboardingFlowLayoutProps {
  title: string;
  subtitle: string;
  returnTo: string;
  logo?: SupportedLogo;
  euiIconType?: EuiIconType;
  banners?: React.ReactNode;
  steps: EuiStepsProps['steps'];
  feedback?: React.ReactNode;
  bodyDataTestSubj?: string;
  returnDataTestSubj?: string;
}

export const OnboardingFlowLayout: React.FC<OnboardingFlowLayoutProps> = ({
  title,
  subtitle,
  returnTo,
  logo,
  euiIconType,
  banners,
  steps,
  feedback,
  bodyDataTestSubj,
  returnDataTestSubj,
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPageTemplate paddingSize="none">
      <OnboardingFlowHeader
        title={title}
        subtitle={subtitle}
        logo={logo}
        euiIconType={euiIconType}
        returnTo={returnTo}
        returnDataTestSubj={returnDataTestSubj}
      />
      <EuiPageTemplate.Section paddingSize="xl" restrictWidth>
        <div data-test-subj={bodyDataTestSubj}>
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
