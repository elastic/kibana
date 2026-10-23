/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import { EuiFlexGroup, EuiLoadingSpinner, EuiSpacer, EuiTitle, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { InvestigatorServiceAccountStatus } from '@kbn/nightshift-investigations-plugin/common';
import { NightshiftHeader } from '../app/header';
import { NightshiftSetupPrompt } from '../service_account/nightshift_setup_prompt';
import { OnboardingIntroBanner } from './intro_banner';
import {
  OnboardingStepsCard,
  type OnboardingStepId,
  type OnboardingStepState,
} from './onboarding_steps';

const STEPS: Record<OnboardingStepId, OnboardingStepState> = {
  enable: { status: 'current' },
  connect: { status: 'disabled' },
  investigate: { status: 'disabled' },
  automate: { status: 'disabled' },
};

/**
 * Onboarding before the space is set up: the "Enable Elastic Nightshift" step comes before the
 * other onboarding steps, below the intro video. Nightshift runs as the space's service account,
 * so nothing else in the app works until an admin enables it; once they do, the regular
 * onboarding continues with that step complete.
 */
export function NightshiftSetupOnboarding({
  status,
  isLoading,
}: {
  status: InvestigatorServiceAccountStatus | undefined;
  isLoading: boolean;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      responsive={false}
      data-test-subj="nightshiftSetupOnboarding"
      css={css`
        margin-top: ${euiTheme.size.l};
        padding-bottom: calc(${euiTheme.size.xxl} * 1.5);
      `}
    >
      <NightshiftHeader
        title={i18n.translate('xpack.nightshift.onboarding.setup.heroTitle', {
          defaultMessage: 'Meet Elastic Nightshift',
        })}
        isGreetingInline
      />
      <EuiSpacer size="l" />
      <OnboardingIntroBanner />
      <EuiSpacer size="xl" />
      <div
        css={css`
          display: grid;
          grid-template-columns: minmax(0, 1fr) 280px;
          gap: ${euiTheme.size.l};
          align-items: start;
        `}
      >
        <div
          css={css`
            min-width: 0;
          `}
        >
          <EuiTitle size="s">
            <h3>
              {i18n.translate('xpack.nightshift.onboarding.setup.stepTitle', {
                defaultMessage: 'Enable Elastic Nightshift',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="m" />
          {isLoading ? <EuiLoadingSpinner size="l" /> : <NightshiftSetupPrompt status={status} />}
        </div>
        <OnboardingStepsCard steps={STEPS} />
      </div>
    </EuiFlexGroup>
  );
}
