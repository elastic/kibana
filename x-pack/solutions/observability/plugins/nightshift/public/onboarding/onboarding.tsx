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
  EuiTitle,
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
import { useCurrentUserName } from '../hooks/use_current_user_name';
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
import type { OnboardingSuggestionsExecution } from '@kbn/nightshift-investigations-plugin/common';
import { CONNECT_SUB_STEP_TITLES, OnboardingConnectStep } from './connect_step';
import { OnboardingFirstInvestigationStep } from './first_investigation_step';
import { OnboardingAutomationStep } from './automation_step';
import { useOnboarding, useStartOnboardingSuggestions } from './use_onboarding';
import { groupHasConnector } from '../sandbox_connectors/connect_sources_grid';
import { useConnectorsByType } from '../sandbox_connectors/use_connectors_by_type';

/** Steps after enable; driven by Proceed / Skip / Back. */
type NavigableStep = Exclude<OnboardingStepId, 'enable'>;

/** Shown until the suggestions run is created — same gathering UI, no blank spinner. */
const PENDING_SUGGESTIONS_EXECUTION: OnboardingSuggestionsExecution = {
  execution_id: 'pending',
  status: 'running',
};

/** Placeholder until the investigations list refetches the conversation just started. */
const pendingInvestigation = (investigationId: string): InvestigationSummary => {
  const now = new Date().toISOString();
  return {
    id: investigationId,
    title: '',
    title_pending: true,
    created_at: now,
    updated_at: now,
    agent_id: 'nightshift.investigation',
    metadata: { status: 'open' },
    in_progress: true,
    subjects: [],
  };
};

const HERO_TITLES: Record<OnboardingStepId, string> = {
  enable: i18n.translate('xpack.nightshift.onboarding.heroTitleEnable', {
    defaultMessage: 'Meet the Elastic nightshift AI SRE',
  }),
  connect: i18n.translate('xpack.nightshift.onboarding.heroTitle', {
    defaultMessage: 'Meet the Elastic nightshift AI SRE',
  }),
  sources: i18n.translate('xpack.nightshift.onboarding.heroTitleSources', {
    defaultMessage: 'Meet the Elastic nightshift AI SRE',
  }),
  investigate: i18n.translate('xpack.nightshift.onboarding.heroTitleInvestigate', {
    defaultMessage: 'Try first investigation',
  }),
  automate: i18n.translate('xpack.nightshift.onboarding.heroTitleAutomate', {
    defaultMessage: 'Create first automation',
  }),
};

const OPTIONAL_HINT = i18n.translate('xpack.nightshift.onboarding.steps.optionalHint', {
  defaultMessage: 'Optional',
});

const PROCEED_LABEL = i18n.translate('xpack.nightshift.onboarding.proceedButton', {
  defaultMessage: 'Proceed',
});

const SKIP_STEP_LABEL = i18n.translate('xpack.nightshift.onboarding.skipStepButton', {
  defaultMessage: 'Skip this step',
});

const BACK_LABEL = i18n.translate('xpack.nightshift.onboarding.backButton', {
  defaultMessage: 'Back',
});

const INVESTIGATE_SECTION_TITLE = i18n.translate(
  'xpack.nightshift.onboarding.investigate.sectionTitle',
  { defaultMessage: 'Try your first investigation' }
);

const backButtonStyles = css`
  width: 100%;
`;

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
  const greetingName = useCurrentUserName();
  const history = useHistory();
  const { search } = useLocation();
  const { data, isInitialLoading } = useOnboarding();
  // The enable step binds the space's service accounts and installs the agent in one click.
  const serviceAccount = useInvestigatorServiceAccount();
  const startSuggestions = useStartOnboardingSuggestions();
  const { groups: connectorGroups } = useConnectorsByType();
  const hasTelemetryConnector = groupHasConnector(connectorGroups, 'telemetry');
  const hasAdditionalConnector = groupHasConnector(connectorGroups, 'additional');
  // Null until the user moves; then Proceed / Skip / Back own the step.
  const [activeStep, setActiveStep] = useState<NavigableStep | null>(null);
  const [skippedInvestigate, setSkippedInvestigate] = useState(false);
  // Filled the moment Investigate succeeds, so step 5 shows the trial card before the list refetches.
  const [startedInvestigation, setStartedInvestigation] = useState<InvestigationSummary>();

  const execution = data?.execution;
  // Step 1 is done once the space is bound to its service accounts and the agent is installed:
  // one click does both, and removing the binding brings the step back.
  const isEnabled = data?.agent_installed === true && isNightshiftSetUp(serviceAccount.data);
  // Prefer the optimistic card until the list includes the conversation just started.
  const trialInvestigation =
    startedInvestigation && latestInvestigation?.id !== startedInvestigation.id
      ? startedInvestigation
      : latestInvestigation ?? startedInvestigation;
  const reachedAutomate = trialInvestigation != null || skippedInvestigate;

  const defaultStep: NavigableStep = !execution
    ? 'connect'
    : reachedAutomate
    ? 'automate'
    : 'investigate';

  const step: OnboardingStepId = !isEnabled ? 'enable' : activeStep ?? defaultStep;

  const goTo = useCallback((next: NavigableStep) => {
    setActiveStep(next);
  }, []);

  const goToInvestigate = useCallback(() => {
    goTo('investigate');
    if (!execution) {
      startSuggestions.mutate();
    }
  }, [execution, goTo, startSuggestions]);

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

  const connectStatus: OnboardingStepState['status'] = !isEnabled
    ? 'disabled'
    : step === 'connect'
    ? 'current'
    : 'complete';
  const sourcesStatus: OnboardingStepState['status'] =
    !isEnabled || step === 'connect'
      ? 'disabled'
      : step === 'sources'
      ? 'current'
      : 'complete';
  const investigateStatus: OnboardingStepState['status'] =
    !isEnabled || step === 'connect' || step === 'sources'
      ? 'disabled'
      : step === 'investigate'
      ? 'current'
      : trialInvestigation != null || skippedInvestigate
      ? 'complete'
      : 'disabled';
  const automateStatus: OnboardingStepState['status'] =
    step === 'automate' ? 'current' : 'disabled';

  // Completed steps (except enable) are links so the user can jump back; enable stays locked.
  const steps: Record<OnboardingStepId, OnboardingStepState> = {
    enable: {
      status: isEnabled ? 'complete' : 'current',
    },
    connect: {
      status: connectStatus,
      onClick: connectStatus === 'complete' ? () => goTo('connect') : undefined,
    },
    sources: {
      status: sourcesStatus,
      hint: OPTIONAL_HINT,
      onClick: sourcesStatus === 'complete' ? () => goTo('sources') : undefined,
    },
    investigate: {
      status: investigateStatus,
      hint:
        step === 'investigate' && (!execution || execution.status === 'running')
          ? i18n.translate('xpack.nightshift.onboarding.steps.analyzingHint', {
              defaultMessage: 'Analyzing your data…',
            })
          : OPTIONAL_HINT,
      onClick: investigateStatus === 'complete' ? () => goTo('investigate') : undefined,
    },
    automate: {
      status: automateStatus,
      hint: OPTIONAL_HINT,
    },
  };

  const stepAction =
    step === 'connect' ? (
      hasTelemetryConnector ? (
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiButton
            fill
            fullWidth
            size="s"
            iconType="sortRight"
            iconSide="right"
            onClick={() => goTo('sources')}
            data-test-subj="nightshiftOnboardingContinueButton"
          >
            {PROCEED_LABEL}
          </EuiButton>
        </EuiFlexGroup>
      ) : undefined
    ) : step === 'sources' ? (
      <EuiFlexGroup direction="column" gutterSize="s">
        {hasAdditionalConnector ? (
          <EuiButton
            fill
            fullWidth
            size="s"
            iconType="sortRight"
            iconSide="right"
            isLoading={startSuggestions.isLoading}
            onClick={goToInvestigate}
            data-test-subj="nightshiftOnboardingContinueButton"
          >
            {PROCEED_LABEL}
          </EuiButton>
        ) : (
          <EuiButton
            fill
            fullWidth
            size="s"
            iconType="sortRight"
            iconSide="right"
            isLoading={startSuggestions.isLoading}
            onClick={goToInvestigate}
            data-test-subj="nightshiftOnboardingStartButton"
          >
            {SKIP_STEP_LABEL}
          </EuiButton>
        )}
        <EuiButtonEmpty
          size="s"
          iconType="sortLeft"
          iconSide="left"
          css={backButtonStyles}
          onClick={() => goTo('connect')}
          data-test-subj="nightshiftOnboardingBackToTelemetryButton"
        >
          {BACK_LABEL}
        </EuiButtonEmpty>
      </EuiFlexGroup>
    ) : step === 'investigate' ? (
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiButton
          fill
          fullWidth
          size="s"
          iconType="sortRight"
          iconSide="right"
          onClick={() => {
            setSkippedInvestigate(true);
            goTo('automate');
          }}
          data-test-subj="nightshiftOnboardingSkipInvestigationButton"
        >
          {SKIP_STEP_LABEL}
        </EuiButton>
        <EuiButtonEmpty
          size="s"
          iconType="sortLeft"
          iconSide="left"
          css={backButtonStyles}
          onClick={() => goTo('sources')}
          data-test-subj="nightshiftOnboardingBackToConnectButton"
        >
          {BACK_LABEL}
        </EuiButtonEmpty>
      </EuiFlexGroup>
    ) : step === 'automate' ? (
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiButton
          fullWidth
          size="s"
          iconType="sortRight"
          iconSide="right"
          onClick={onFinish}
          data-test-subj="nightshiftOnboardingFinishButton"
        >
          {trialInvestigation?.in_progress
            ? SKIP_STEP_LABEL
            : i18n.translate('xpack.nightshift.onboarding.doItLaterButton', {
                defaultMessage: "I'll do it later",
              })}
        </EuiButton>
        <EuiButtonEmpty
          size="s"
          iconType="sortLeft"
          iconSide="left"
          css={backButtonStyles}
          onClick={() => {
            setSkippedInvestigate(false);
            goTo('investigate');
          }}
          data-test-subj="nightshiftOnboardingBackToInvestigateButton"
        >
          {BACK_LABEL}
        </EuiButtonEmpty>
      </EuiFlexGroup>
    ) : undefined;

  const sectionTitle =
    step === 'connect'
      ? CONNECT_SUB_STEP_TITLES.telemetry
      : step === 'sources'
      ? CONNECT_SUB_STEP_TITLES.additional
      : step === 'investigate'
      ? INVESTIGATE_SECTION_TITLE
      : undefined;

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
      <NightshiftHeader title={HERO_TITLES[step]} isGreetingInline greetingName={greetingName} />
      <EuiSpacer size="l" />
      {/* Intro banner on the early "Meet Nightshift" steps (enable → sources). */}
      {(step === 'enable' || step === 'connect' || step === 'sources') && (
        <>
          <OnboardingIntroBanner />
          <EuiSpacer size="xl" />
        </>
      )}
      {sectionTitle && (
        <>
          <EuiTitle size="s">
            <h3 data-test-subj="nightshiftOnboardingStepTitle">{sectionTitle}</h3>
          </EuiTitle>
          <EuiSpacer size="m" />
        </>
      )}
      <div
        css={css`
          display: grid;
          grid-template-columns: minmax(0, 1fr) 280px;
          gap: ${euiTheme.size.base};
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
          ) : step === 'connect' ? (
            <OnboardingConnectStep subStep="telemetry" />
          ) : step === 'sources' ? (
            <OnboardingConnectStep subStep="additional" />
          ) : step === 'investigate' ? (
            <OnboardingFirstInvestigationStep
              execution={execution ?? PENDING_SUGGESTIONS_EXECUTION}
              onInvestigationStarted={(investigationId) => {
                setStartedInvestigation(pendingInvestigation(investigationId));
                goTo('automate');
              }}
            />
          ) : (
            <OnboardingAutomationStep
              investigation={trialInvestigation}
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
