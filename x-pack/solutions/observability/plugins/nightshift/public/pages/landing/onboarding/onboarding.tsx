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
  EuiFlexGroup,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import type { OnboardingSuggestionsExecution } from '@kbn/nightshift-investigations-plugin/common';
import { NightshiftHeader } from '../header';
import { useFlyoutShareUrlCustomAction } from '../../../components/ui/flyout_share_url_button';
import {
  buildNightshiftInvestigationFlyoutShareUrl,
  clearNightshiftInvestigationIdParam,
  getNightshiftInvestigationIdFromSearch,
  setNightshiftInvestigationIdParam,
} from '../../../common/url_params';
import { useKibana } from '../../../hooks/use_kibana';
import { useCurrentUserName } from '../../../hooks/use_current_user_name';
import { OnboardingIntroBanner } from './intro_banner';
import {
  ONBOARDING_STEP_IDS,
  OnboardingStepsCard,
  type OnboardingStepId,
  type OnboardingStepState,
  type OnboardingStepStatus,
} from './onboarding_steps';
import { NightshiftSetupPrompt } from './nightshift_setup_prompt';
import {
  isNightshiftSetUp,
  useInvestigatorServiceAccount,
} from '../../../data/service_accounts/use_investigator_service_account';
import { ADD_DATA_TITLE, OnboardingAddDataStep } from './add_data_step';
import { CONNECT_SOURCES_TITLE, OnboardingConnectSourcesStep } from './connect_sources_step';
import { OnboardingFirstInvestigationStep } from './first_investigation_step';
import { OnboardingAutomationStep } from './automation_step';
import { useOnboarding, useStartOnboardingSuggestions } from './use_onboarding';
import { useFetchAutomations } from '../../../data/automations/use_automations';
import { useConnectorsByType } from '../../../data/sandbox_connectors/use_connectors_by_type';
import {
  isAdditionalType,
  isTelemetryType,
} from '../../../components/entities/sandbox_connector/connect_sources_grid';

/** A step the user went back to; otherwise the step follows from the onboarding state. */
type StepOverride = 'addData' | 'connectSources' | 'investigate' | undefined;

const HERO_TITLES: Record<OnboardingStepId, string> = {
  enable: i18n.translate('xpack.nightshift.onboarding.heroTitleEnable', {
    defaultMessage: 'Meet Elastic nightshift',
  }),
  addData: i18n.translate('xpack.nightshift.onboarding.heroTitleAddData', {
    defaultMessage: 'Meet Elastic nightshift',
  }),
  connectSources: i18n.translate('xpack.nightshift.onboarding.heroTitleConnectSources', {
    defaultMessage: 'Meet Elastic nightshift',
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

const SKIP_LABEL = i18n.translate('xpack.nightshift.onboarding.skipStepButton', {
  defaultMessage: 'Skip this step',
});

const OPTIONAL_HINT = i18n.translate('xpack.nightshift.onboarding.steps.optionalHint', {
  defaultMessage: 'Optional',
});

const INVESTIGATE_SECTION_TITLE = i18n.translate(
  'xpack.nightshift.onboarding.investigate.sectionTitle',
  { defaultMessage: 'Try first investigation' }
);

const ENABLE_SECTION_TITLE = i18n.translate('xpack.nightshift.onboarding.enable.sectionTitle', {
  defaultMessage: 'Enable Elastic nightshift',
});

const AUTOMATE_SECTION_TITLE = i18n.translate('xpack.nightshift.onboarding.automate.trialTitle', {
  defaultMessage: 'Try first investigation',
});

/** Stub execution so analyze/suggestions URL forces work before a real workflow run exists. */
const DESIGN_PREVIEW_EXECUTION: OnboardingSuggestionsExecution = {
  execution_id: 'design-preview',
  status: 'running',
};

/**
 * First-run Nightshift: enable the space, add telemetry data, connect other sources, try a first
 * investigation, create a first automation. The steps follow from the latest onboarding workflow
 * execution, the space's latest investigation and (in the page) whether an automation exists.
 * Completed steps other than Enable link back to themselves.
 */
export function NightshiftOnboarding({
  latestInvestigation,
  automationsHref,
  onFinish,
}: {
  latestInvestigation?: InvestigationSummary;
  automationsHref?: string;
  /** "Skip this step" / Done on the last step. */
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
  const [stepOverride, setStepOverride] = useState<StepOverride>();
  const automations = useFetchAutomations({ enabled: automationsHref != null });
  const hasAutomation = (automations.data?.automations.length ?? 0) > 0;
  // Design/dev URL forces (keep while iterating onboarding UI):
  //   ?analyzing=1 — gathering banner
  //   ?suggestions=1 — live suggestion list when the space has any (else empty)
  //   ?suggestions=empty — empty suggestions state
  //   ?investigating=1 — trial card in progress
  //   (no force) — investigation ready / automate when a trial exists
  const searchParams = new URLSearchParams(search);
  const forceAnalyzing = searchParams.get('analyzing') === '1';
  const suggestionsParam = searchParams.get('suggestions');
  const forceSuggestionsFilled = suggestionsParam === '1';
  const forceSuggestionsEmpty = suggestionsParam === 'empty';
  const forceSuggestions = forceSuggestionsFilled || forceSuggestionsEmpty;
  const forceInvestigating = searchParams.get('investigating') === '1';

  const execution = data?.execution;
  const liveSuggestions = execution?.suggestions;
  // Forced empty / analyzing must not start real investigations or retries.
  const isDesignPreviewReadOnly = forceAnalyzing || forceSuggestionsEmpty;
  const designExecution: OnboardingSuggestionsExecution | undefined = forceAnalyzing
    ? { ...(execution ?? DESIGN_PREVIEW_EXECUTION), status: 'running', suggestions: undefined }
    : forceSuggestions
    ? {
        ...(execution ?? DESIGN_PREVIEW_EXECUTION),
        status: 'succeeded',
        // No hardcoded fallbacks — same stance as #304159 (empty when nothing real).
        suggestions: forceSuggestionsEmpty ? [] : liveSuggestions ?? [],
      }
    : execution;
  // Step 1 is done once the space is bound to its service accounts and the agent is installed:
  // one click does both, and removing the binding brings the step back.
  const isEnabled = data?.agent_installed === true && isNightshiftSetUp(serviceAccount.data);
  // Step 2 is done once an exploration run exists.
  const isConnected = execution != null;
  // A source is connected once a connector of a type offered on the step is assigned to the
  // agent: creating one from a card assigns it; a preconfigured one has to be assigned by hand.
  const hasSourceOf = (isOfType: (actionTypeId: string) => boolean) =>
    connectorGroups.some(
      ({ actionType, assignedCount }) => isOfType(actionType.id) && assignedCount > 0
    );
  // Proceed on Add data needs a telemetry source; Connect other sources can be skipped without one.
  const hasTelemetrySource = hasSourceOf(isTelemetryType);
  const hasAdditionalSource = hasSourceOf(isAdditionalType);

  // A new execution (setup changed, or a retry) ends any detour.
  const [lastExecutionId, setLastExecutionId] = useState(execution?.execution_id);
  if (execution?.execution_id !== lastExecutionId) {
    setLastExecutionId(execution?.execution_id);
    setStepOverride(undefined);
  }

  // Before an exploration run exists, Proceed on Add data moves to Connect other sources locally.
  const step: OnboardingStepId =
    forceAnalyzing || forceSuggestions
      ? 'investigate'
      : !isEnabled
      ? 'enable'
      : stepOverride === 'addData' || stepOverride === 'connectSources'
      ? stepOverride
      : !isConnected
      ? 'addData'
      : latestInvestigation && stepOverride !== 'investigate'
      ? 'automate'
      : 'investigate';

  const trialInvestigation =
    forceInvestigating && latestInvestigation
      ? { ...latestInvestigation, in_progress: true }
      : latestInvestigation;

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

  // Status is positional: earlier steps are complete, later ones disabled.
  const currentIndex = ONBOARDING_STEP_IDS.indexOf(step);
  const statusOf = (id: OnboardingStepId): OnboardingStepStatus => {
    const index = ONBOARDING_STEP_IDS.indexOf(id);
    return index < currentIndex ? 'complete' : index > currentIndex ? 'disabled' : 'current';
  };
  // Links follow reachability, not position: a step links whenever its Proceed path is open, so
  // a step stays reachable from a detour to an earlier one, and a step not reachable yet cannot
  // be jumped to. Enable and Automate never link.
  const isReachable: Record<'addData' | 'connectSources' | 'investigate', boolean> = {
    addData: isEnabled,
    // Same gate as Proceed on Add data.
    connectSources: isEnabled && (isConnected || hasTelemetrySource),
    investigate: isConnected,
  };
  const linkTo = (id: 'addData' | 'connectSources' | 'investigate') =>
    isReachable[id] && step !== id ? () => setStepOverride(id) : undefined;

  const steps: Record<OnboardingStepId, OnboardingStepState> = {
    enable: { status: statusOf('enable') },
    addData: { status: statusOf('addData'), onClick: linkTo('addData') },
    connectSources: {
      status: statusOf('connectSources'),
      onClick: linkTo('connectSources'),
      hint: step === 'connectSources' ? OPTIONAL_HINT : undefined,
    },
    investigate: {
      status: statusOf('investigate'),
      onClick: linkTo('investigate'),
      hint:
        step === 'investigate' && designExecution?.status === 'running'
          ? i18n.translate('xpack.nightshift.onboarding.steps.analyzingHint', {
              defaultMessage: 'Analyzing your data…',
            })
          : undefined,
    },
    automate: {
      status: hasAutomation ? 'complete' : step === 'automate' ? 'current' : 'disabled',
      // Only a completed automate step links back; an unfinished one stays unlinked.
      onClick: hasAutomation && step !== 'automate' ? () => setStepOverride(undefined) : undefined,
    },
  };

  const stepAction =
    step === 'addData' ? (
      hasTelemetrySource && (
        <EuiButton
          fill
          fullWidth
          size="s"
          iconType="sortRight"
          iconSide="right"
          onClick={() => setStepOverride('connectSources')}
          data-test-subj="nightshiftOnboardingAddDataProceedButton"
        >
          {PROCEED_LABEL}
        </EuiButton>
      )
    ) : step === 'connectSources' ? (
      // The first pass starts looking for first investigations; a revisit just returns to them.
      <EuiButton
        fill={hasAdditionalSource}
        fullWidth
        size="s"
        iconType="sortRight"
        iconSide="right"
        isLoading={startSuggestions.isLoading}
        onClick={() => (isConnected ? setStepOverride(undefined) : startSuggestions.mutate())}
        data-test-subj="nightshiftOnboardingConnectSourcesProceedButton"
      >
        {hasAdditionalSource ? PROCEED_LABEL : SKIP_LABEL}
      </EuiButton>
    ) : step === 'investigate' ? (
      latestInvestigation && (
        <EuiButton
          fullWidth
          size="s"
          iconType="sortRight"
          iconSide="right"
          onClick={() => setStepOverride(undefined)}
          data-test-subj="nightshiftOnboardingProceedToAutomationButton"
        >
          {SKIP_LABEL}
        </EuiButton>
      )
    ) : step === 'automate' ? (
      <EuiButton
        fullWidth
        size="s"
        fill={hasAutomation}
        iconType={hasAutomation ? 'check' : 'sortRight'}
        iconSide={hasAutomation ? 'left' : 'right'}
        onClick={onFinish}
        data-test-subj={
          hasAutomation ? 'nightshiftOnboardingDoneButton' : 'nightshiftOnboardingFinishButton'
        }
      >
        {hasAutomation
          ? i18n.translate('xpack.nightshift.onboarding.doneButton', {
              defaultMessage: 'Done',
            })
          : SKIP_LABEL}
      </EuiButton>
    ) : undefined;

  const sectionTitle =
    step === 'enable'
      ? ENABLE_SECTION_TITLE
      : step === 'addData'
      ? ADD_DATA_TITLE
      : step === 'connectSources'
      ? CONNECT_SOURCES_TITLE
      : step === 'investigate'
      ? INVESTIGATE_SECTION_TITLE
      : step === 'automate'
      ? AUTOMATE_SECTION_TITLE
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
      {(step === 'enable' || step === 'addData' || step === 'connectSources') && (
        <>
          <OnboardingIntroBanner />
          <EuiSpacer size="xl" />
        </>
      )}
      {sectionTitle && (
        <>
          <EuiTitle size="xs">
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
          ) : step === 'connectSources' ? (
            <OnboardingConnectSourcesStep />
          ) : step === 'addData' || !designExecution ? (
            <OnboardingAddDataStep />
          ) : step === 'investigate' || !trialInvestigation ? (
            <OnboardingFirstInvestigationStep
              execution={designExecution}
              previewOnly={isDesignPreviewReadOnly}
              onInvestigationStarted={() => setStepOverride(undefined)}
            />
          ) : (
            <OnboardingAutomationStep
              investigation={trialInvestigation}
              isInvestigationSelected={selectedInvestigationId === trialInvestigation.id}
              automations={automations.data?.automations ?? []}
              automationsAvailable={automationsHref != null}
              onInvestigationClick={openInvestigation}
            />
          )}
        </div>
        <OnboardingStepsCard steps={steps} action={stepAction} />
      </div>
    </EuiFlexGroup>
  );
}
