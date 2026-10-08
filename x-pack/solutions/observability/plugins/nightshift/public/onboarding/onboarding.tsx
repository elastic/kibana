/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useState } from 'react';
import {
  EuiFlexGroup,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { NightshiftHeader } from '../app/header';
import { OnboardingIntroBanner } from './intro_banner';
import { OnboardingSteps } from './onboarding_steps';
import { OnboardingConnectStep } from './connect_step';
import { OnboardingFirstInvestigationStep } from './first_investigation_step';
import { useOnboarding } from './use_onboarding';

/**
 * First-run Nightshift: connect a deployment, then start the first investigation from a
 * suggestion. All state comes from the latest onboarding suggestions workflow execution.
 */
export function NightshiftOnboarding({
  onInvestigationStarted,
}: {
  onInvestigationStarted: (investigationId: string) => void;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const { data, isInitialLoading } = useOnboarding();
  const [isChangingDeployment, setIsChangingDeployment] = useState(false);

  const execution = data?.execution;
  const isConnected = Boolean(execution && execution.connectors.length > 0);
  const showConnect = !isConnected || isChangingDeployment;

  // Picking a deployment starts a new execution, which ends the "change" detour.
  const [lastExecutionId, setLastExecutionId] = useState(execution?.execution_id);
  if (execution?.execution_id !== lastExecutionId) {
    setLastExecutionId(execution?.execution_id);
    setIsChangingDeployment(false);
  }

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      responsive={false}
      data-test-subj="nightshiftOnboarding"
      css={css`
        margin-top: ${euiTheme.size.l};
        padding-bottom: calc(${euiTheme.size.xxl} * 1.5);
      `}
    >
      <NightshiftHeader
        title={
          showConnect
            ? i18n.translate('xpack.nightshift.onboarding.heroTitle', {
                defaultMessage: "Let's get you onboarded",
              })
            : i18n.translate('xpack.nightshift.onboarding.heroTitleReady', {
                defaultMessage: "Let's start investigating",
              })
        }
      />
      <EuiSpacer size="l" />
      {showConnect && (
        <>
          <OnboardingIntroBanner />
          <EuiSpacer size="l" />
        </>
      )}
      <EuiPanel hasBorder paddingSize="l">
        <EuiTitle size="xxs">
          <h2>
            {i18n.translate('xpack.nightshift.onboarding.getStartedTitle', {
              defaultMessage: 'Get started',
            })}
          </h2>
        </EuiTitle>
        <EuiSpacer size="m" />
        <OnboardingSteps
          statuses={
            showConnect ? ['current', 'disabled', 'disabled'] : ['complete', 'current', 'disabled']
          }
        />
        <EuiSpacer size="l" />
        {isInitialLoading ? (
          <EuiLoadingSpinner size="l" />
        ) : showConnect || !execution ? (
          <OnboardingConnectStep
            initialSelectedIds={execution?.connectors.map(({ id }) => id)}
            onCancel={isConnected ? () => setIsChangingDeployment(false) : undefined}
          />
        ) : (
          <OnboardingFirstInvestigationStep
            execution={execution}
            onInvestigationStarted={onInvestigationStarted}
            onChangeDeployment={() => setIsChangingDeployment(true)}
          />
        )}
      </EuiPanel>
    </EuiFlexGroup>
  );
}
