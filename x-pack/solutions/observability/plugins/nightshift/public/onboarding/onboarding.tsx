/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiLoadingSpinner,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ListInvestigationItem } from '@kbn/nightshift-investigations-plugin/common';
import { NightshiftHeader } from '../app/header';
import {
  clearNightshiftInvestigationIdParam,
  getNightshiftInvestigationIdFromSearch,
  setNightshiftInvestigationIdParam,
} from '../common/url_params';
import { InvestigationDetailFlyout } from '../investigation/investigation_detail_flyout';
import { OnboardingIntroBanner } from './intro_banner';
import {
  OnboardingStepsCard,
  type OnboardingStepId,
  type OnboardingStepState,
} from './onboarding_steps';
import { OnboardingConnectStep } from './connect_step';
import { OnboardingFirstInvestigationStep } from './first_investigation_step';
import { OnboardingAutomationStep } from './automation_step';
import { useFetchSandboxSecrets } from '../sandbox_secrets/use_fetch_sandbox_secrets';
import { useOnboarding, useStartOnboardingSuggestions } from './use_onboarding';

/** A step the user went back to; otherwise the step follows from the onboarding state. */
type StepOverride = 'connect' | 'investigate' | undefined;

const HERO_TITLES: Record<OnboardingStepId, string> = {
  connect: i18n.translate('xpack.nightshift.onboarding.heroTitle', {
    defaultMessage: 'Meet Elastic Nightshift',
  }),
  investigate: i18n.translate('xpack.nightshift.onboarding.heroTitleInvestigate', {
    defaultMessage: 'Try first investigation',
  }),
  automate: i18n.translate('xpack.nightshift.onboarding.heroTitleAutomate', {
    defaultMessage: 'Create first automation',
  }),
};

const PROCEED_LABEL = i18n.translate('xpack.nightshift.onboarding.proceedButton', {
  defaultMessage: 'Proceed',
});

/**
 * First-run Nightshift: add signals and alerts, try a first investigation, create a first
 * automation. The steps follow from the latest onboarding workflow execution, the space's latest
 * investigation and (in the page) whether an automation exists.
 */
export function NightshiftOnboarding({
  latestInvestigation,
  automationsHref,
  onFinish,
}: {
  latestInvestigation?: ListInvestigationItem;
  automationsHref?: string;
  /** "I'll do it later" on the last step. */
  onFinish: () => void;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const history = useHistory();
  const { search } = useLocation();
  const { data, isInitialLoading } = useOnboarding();
  const startSuggestions = useStartOnboardingSuggestions();
  const [stepOverride, setStepOverride] = useState<StepOverride>();

  // The exploration needs at least one saved sandbox secret; the server enforces it too.
  const hasSecret = (useFetchSandboxSecrets().data?.keys.length ?? 0) > 0;

  const execution = data?.execution;
  // Step 1 is done once an exploration run exists.
  const isConnected = execution != null;

  // A new execution (setup changed, or a retry) ends any detour.
  const [lastExecutionId, setLastExecutionId] = useState(execution?.execution_id);
  if (execution?.execution_id !== lastExecutionId) {
    setLastExecutionId(execution?.execution_id);
    setStepOverride(undefined);
  }

  const step: OnboardingStepId =
    !isConnected || stepOverride === 'connect'
      ? 'connect'
      : latestInvestigation && stepOverride !== 'investigate'
      ? 'automate'
      : 'investigate';

  const selectedInvestigationId = useMemo(
    () => getNightshiftInvestigationIdFromSearch(search),
    [search]
  );
  const openInvestigation = useCallback(
    ({ investigation_id: investigationId }: Pick<ListInvestigationItem, 'investigation_id'>) => {
      const params = new URLSearchParams(history.location.search);
      setNightshiftInvestigationIdParam(params, investigationId);
      history.replace({ search: params.toString() });
    },
    [history]
  );
  const closeInvestigation = useCallback(() => {
    const params = new URLSearchParams(history.location.search);
    clearNightshiftInvestigationIdParam(params);
    history.replace({ search: params.toString() });
  }, [history]);

  const steps: Record<OnboardingStepId, OnboardingStepState> = {
    connect: {
      status: step === 'connect' ? 'current' : 'complete',
      onClick: step !== 'connect' ? () => setStepOverride('connect') : undefined,
      hint:
        step !== 'connect'
          ? undefined
          : hasSecret
          ? i18n.translate('xpack.nightshift.onboarding.steps.connectOptionalHint', {
              defaultMessage: 'Slack and hints are optional',
            })
          : i18n.translate('xpack.nightshift.onboarding.steps.connectSecretRequiredHint', {
              defaultMessage: 'Save at least one credential',
            }),
    },
    investigate: {
      status: step === 'investigate' ? 'current' : latestInvestigation ? 'complete' : 'disabled',
      onClick:
        isConnected && step !== 'investigate' ? () => setStepOverride('investigate') : undefined,
      hint:
        step === 'investigate' && execution?.status === 'running'
          ? i18n.translate('xpack.nightshift.onboarding.steps.analyzingHint', {
              defaultMessage: 'Analyzing your data…',
            })
          : undefined,
    },
    automate: {
      status: step === 'automate' ? 'current' : 'disabled',
      onClick:
        latestInvestigation && isConnected && step !== 'automate'
          ? () => setStepOverride(undefined)
          : undefined,
    },
  };

  const stepAction =
    step === 'connect' ? (
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiButton
          fill
          fullWidth
          size="s"
          iconType="sortRight"
          iconSide="right"
          isDisabled={!hasSecret}
          isLoading={startSuggestions.isLoading}
          onClick={() => startSuggestions.mutate()}
          data-test-subj="nightshiftOnboardingContinueButton"
        >
          {PROCEED_LABEL}
        </EuiButton>
        {isConnected && (
          <EuiButtonEmpty
            size="s"
            onClick={() => setStepOverride(undefined)}
            data-test-subj="nightshiftOnboardingBackToSuggestionsButton"
          >
            {i18n.translate('xpack.nightshift.onboarding.cancelEditButton', {
              defaultMessage: 'Back to suggestions',
            })}
          </EuiButtonEmpty>
        )}
      </EuiFlexGroup>
    ) : step === 'investigate' && latestInvestigation ? (
      <EuiButton
        fullWidth
        size="s"
        iconType="sortRight"
        iconSide="right"
        onClick={() => setStepOverride(undefined)}
        data-test-subj="nightshiftOnboardingProceedToAutomationButton"
      >
        {PROCEED_LABEL}
      </EuiButton>
    ) : step === 'automate' ? (
      <EuiButton
        fullWidth
        size="s"
        iconType="sortRight"
        iconSide="right"
        onClick={onFinish}
        data-test-subj="nightshiftOnboardingFinishButton"
      >
        {i18n.translate('xpack.nightshift.onboarding.doItLaterButton', {
          defaultMessage: "I'll do it later",
        })}
      </EuiButton>
    ) : undefined;

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
      <NightshiftHeader title={HERO_TITLES[step]} isGreetingInline />
      <EuiSpacer size="l" />
      {step === 'connect' && !isConnected && (
        <>
          <OnboardingIntroBanner />
          <EuiSpacer size="xl" />
        </>
      )}
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
          {isInitialLoading ? (
            <EuiLoadingSpinner size="l" />
          ) : step === 'connect' || !execution ? (
            <OnboardingConnectStep />
          ) : step === 'investigate' || !latestInvestigation ? (
            <OnboardingFirstInvestigationStep
              execution={execution}
              onInvestigationStarted={() => setStepOverride(undefined)}
              onChangeDeployment={() => setStepOverride('connect')}
            />
          ) : (
            <OnboardingAutomationStep
              investigation={latestInvestigation}
              automationsHref={automationsHref}
              onInvestigationClick={openInvestigation}
            />
          )}
        </div>
        <OnboardingStepsCard steps={steps} action={stepAction} />
      </div>
      {selectedInvestigationId && (
        <InvestigationDetailFlyout
          key={selectedInvestigationId}
          investigationId={selectedInvestigationId}
          onClose={closeInvestigation}
        />
      )}
    </EuiFlexGroup>
  );
}
