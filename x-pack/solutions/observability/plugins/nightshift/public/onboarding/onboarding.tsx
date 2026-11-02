/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import { NightshiftHeader } from '../app/header';
import { useFlyoutShareUrlCustomAction } from '../components/ui/flyout_share_url_button';
import {
  buildNightshiftInvestigationFlyoutShareUrl,
  clearNightshiftInvestigationIdParam,
  getNightshiftInvestigationIdFromSearch,
  setNightshiftInvestigationIdParam,
} from '../common/url_params';
import { useKibana } from '../hooks/use_kibana';
import { OnboardingIntroBanner } from './intro_banner';
import {
  OnboardingStepsCard,
  type OnboardingStepId,
  type OnboardingStepState,
} from './onboarding_steps';
import { NightshiftSetupPrompt } from '../service_account/nightshift_setup_prompt';
import {
  isNightshiftSetUp,
  useInvestigatorServiceAccount,
} from '../service_account/use_investigator_service_account';
import { OnboardingConnectStep } from './connect_step';
import { OnboardingFirstInvestigationStep } from './first_investigation_step';
import { OnboardingAutomationStep } from './automation_step';
import { useOnboarding, useStartOnboardingSuggestions } from './use_onboarding';

/** A step the user went back to; otherwise the step follows from the onboarding state. */
type StepOverride = 'connect' | 'investigate' | undefined;

const HERO_TITLES: Record<OnboardingStepId, string> = {
  enable: i18n.translate('xpack.nightshift.onboarding.heroTitleEnable', {
    defaultMessage: 'Meet Elastic Nightshift',
  }),
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
  latestInvestigation?: InvestigationSummary;
  automationsHref?: string;
  /** "I'll do it later" on the last step. */
  onFinish: () => void;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const { agentBuilder } = useKibana().services;
  const history = useHistory();
  const { search } = useLocation();
  const { data, isInitialLoading } = useOnboarding();
  // The enable step binds the space's service accounts and installs the agent in one click.
  const serviceAccount = useInvestigatorServiceAccount();
  const startSuggestions = useStartOnboardingSuggestions();
  const [stepOverride, setStepOverride] = useState<StepOverride>();

  const execution = data?.execution;
  // Step 1 is done once the space is bound to its service accounts and the agent is installed:
  // one click does both, and removing the binding brings the step back.
  const isEnabled = data?.agent_installed === true && isNightshiftSetUp(serviceAccount.data);
  // Step 2 is done once an exploration run exists.
  const isConnected = execution != null;

  // A new execution (setup changed, or a retry) ends any detour.
  const [lastExecutionId, setLastExecutionId] = useState(execution?.execution_id);
  if (execution?.execution_id !== lastExecutionId) {
    setLastExecutionId(execution?.execution_id);
    setStepOverride(undefined);
  }

  const step: OnboardingStepId = !isEnabled
    ? 'enable'
    : !isConnected || stepOverride === 'connect'
    ? 'connect'
    : latestInvestigation && stepOverride !== 'investigate'
    ? 'automate'
    : 'investigate';

  const selectedInvestigationId = useMemo(
    () => getNightshiftInvestigationIdFromSearch(search),
    [search]
  );
  const openInvestigation = useCallback(
    ({ id: investigationId }: Pick<InvestigationSummary, 'id'>) => {
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

  const getInvestigationShareUrl = useCallback(
    () =>
      selectedInvestigationId
        ? buildNightshiftInvestigationFlyoutShareUrl(selectedInvestigationId)
        : window.location.href,
    [selectedInvestigationId]
  );
  const shareInvestigationAction = useFlyoutShareUrlCustomAction(getInvestigationShareUrl);

  // `?investigationId=` opens the investigation's Agent Builder conversation details flyout.
  useEffect(() => {
    if (!selectedInvestigationId || !agentBuilder) {
      return;
    }
    let closeFlyout: (() => void) | undefined;
    let isCancelled = false;
    void agentBuilder
      .openConversationDetails({
        conversationId: selectedInvestigationId,
        trailingActions: [shareInvestigationAction],
        // Closed by the user, not replaced by another selection or unmounted.
        onClose: () => {
          if (!isCancelled) {
            closeInvestigation();
          }
        },
      })
      .then((close) => {
        if (isCancelled) {
          close();
        } else {
          closeFlyout = close;
        }
      });
    return () => {
      isCancelled = true;
      closeFlyout?.();
    };
  }, [agentBuilder, closeInvestigation, selectedInvestigationId, shareInvestigationAction]);

  const steps: Record<OnboardingStepId, OnboardingStepState> = {
    enable: {
      status: isEnabled ? 'complete' : 'current',
      hint: isEnabled
        ? undefined
        : i18n.translate('xpack.nightshift.onboarding.steps.enableHint', {
            defaultMessage: 'One-time setup of this space',
          }),
    },
    connect: {
      status: !isEnabled ? 'disabled' : step === 'connect' ? 'current' : 'complete',
      onClick: isEnabled && step !== 'connect' ? () => setStepOverride('connect') : undefined,
      hint:
        step !== 'connect'
          ? undefined
          : i18n.translate('xpack.nightshift.onboarding.steps.connectOptionalHint', {
              defaultMessage: 'Connectors, Slack and hints are optional',
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
      {(step === 'enable' || (step === 'connect' && !isConnected)) && (
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
          ) : step === 'enable' ? (
            <NightshiftSetupPrompt status={serviceAccount.data} />
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
    </EuiFlexGroup>
  );
}
