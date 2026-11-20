/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiSkeletonRectangle,
  EuiSkeletonTitle,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { ANALYTICS_TELEMETRY_PREFIX } from '../../constants';
import { useAnalyticsClusterState } from '../../hooks/use_analytics_cluster_state';
import { useChromeHidden } from '../../hooks/use_chrome_hidden';
import { useAnalyticsLinks } from '../../hooks/use_analytics_links';
import { useAnalyticsPreferences } from '../../hooks/use_analytics_preferences';
import { useSampleData } from '../../hooks/use_sample_data';
import { useSourceGeneration } from '../../hooks/use_source_generation';
import {
  getLargestOwnSource,
  getSearchSources,
  resolveJourney,
  toEventsState,
} from '../../journey';
import type { AnalyticsEventSource, ResolvedJourney } from '../../types';
import { AnalyticsPageTemplate } from '../analytics_page_template';
import { LazyAnalyticsSetupStep, LazyConnectStep, LazySearchSetupStep } from '../lazy_views';
import { AddSourceButton } from '../shared/add_source_button';
import { getDefaultEventSource, hasOnlySampleSources } from '../shared/event_source_utils';
import { JourneySwitch } from '../shared/journey_switch';
import { focusTargetHeading, readableLine } from '../shared/shared_styles';
import { useSelectedEventSource } from '../shared/use_selected_event_source';
import { getNextLabel, getSetupTitle, getStepCopy } from './onboarding_copy';
import type { OnboardingStepId } from './onboarding_steps';
import {
  GATE_ONBOARDING_STEPS,
  JOURNEY_ONBOARDING_STEPS,
  ONBOARDING_STEP_COUNT,
  getReachedOnboardingStep,
} from './onboarding_steps';
import { stepProgress } from './onboarding_styles';

const NO_SOURCES: readonly AnalyticsEventSource[] = [];

const STEP_PLACEHOLDER_SIZE = 280;

/**
 * Guided setup: one step on screen at a time. The first step is the ingest gate; the steps after
 * it depend on the kind of data that arrives and cannot be reached before it does.
 */
export const GuidedSetupPage = (): React.JSX.Element => {
  const links = useAnalyticsLinks();
  const sampleData = useSampleData();
  const { state, isError, isFetching, refetch } = useAnalyticsClusterState({ poll: true });
  const { preferredJourney, setPreferredJourney } = useAnalyticsPreferences();
  useChromeHidden(state === undefined ? (isError ? false : undefined) : state.stage === 'noData');

  const resolution =
    state === undefined || state.stage === 'noData'
      ? undefined
      : resolveJourney(state, preferredJourney);
  const journey = resolution?.journey;
  const eventsState = useMemo(
    () => (state === undefined ? undefined : toEventsState(state)),
    [state]
  );
  const eventSources = eventsState?.sources ?? NO_SOURCES;
  const [selectedSource, selectSource] = useSelectedEventSource(eventSources);
  const searchSource = getLargestOwnSource(getSearchSources(state?.sources ?? NO_SOURCES));
  const detectedSource =
    journey === 'analytics' ? getDefaultEventSource(eventSources) : searchSource;

  const steps = journey === undefined ? GATE_ONBOARDING_STEPS : JOURNEY_ONBOARDING_STEPS[journey];
  const reachedStepId =
    state === undefined
      ? undefined
      : journey === undefined
      ? 'connect'
      : getReachedOnboardingStep(journey, state.stage);

  const [chosenStepId, setChosenStepId] = useState<OnboardingStepId>();
  useEffect(() => {
    if (chosenStepId === undefined && reachedStepId !== undefined) {
      setChosenStepId(reachedStepId);
    }
  }, [chosenStepId, reachedStepId]);
  // A step of another journey, or any step beyond the gate while there is no data, is not shown.
  const stepId =
    chosenStepId !== undefined && steps.includes(chosenStepId) ? chosenStepId : reachedStepId;

  // Nothing is generated before the user reaches the questions.
  const generation = useSourceGeneration(
    stepId === 'explore' || stepId === 'dashboard' ? selectedSource : undefined
  );
  const [isAwaitingSampleEvents, setIsAwaitingSampleEvents] = useState(false);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const hasNavigated = useRef(false);

  const goToStep = useCallback((nextStepId: OnboardingStepId): void => {
    hasNavigated.current = true;
    setIsAwaitingSampleEvents(false);
    setChosenStepId(nextStepId);
  }, []);

  const stepIndex = stepId === undefined ? -1 : steps.indexOf(stepId);
  const previousStepId = stepIndex > 0 ? steps[stepIndex - 1] : undefined;
  const nextStepId = stepIndex >= 0 ? steps[stepIndex + 1] : undefined;

  useEffect(() => {
    if (isAwaitingSampleEvents && stepId === 'connect' && nextStepId !== undefined) {
      goToStep(nextStepId);
    }
  }, [isAwaitingSampleEvents, stepId, nextStepId, goToStep]);

  useEffect(() => {
    if (hasNavigated.current) {
      stepHeadingRef.current?.focus();
    }
  }, [stepId]);

  const onSampleInstalled = (): void => {
    setIsAwaitingSampleEvents(true);
    refetch();
  };

  const onSwitchJourney = (nextJourney: ResolvedJourney): void => {
    setPreferredJourney(nextJourney);
    if (state !== undefined) {
      goToStep(getReachedOnboardingStep(nextJourney, state.stage));
    }
  };

  const stepCopy =
    stepId === undefined
      ? undefined
      : getStepCopy(
          stepId,
          journey,
          eventsState !== undefined && hasOnlySampleSources(eventsState)
        );

  const renderStepContent = (currentStepId: OnboardingStepId): React.JSX.Element => {
    switch (currentStepId) {
      case 'connect':
        return (
          <LazyConnectStep
            links={links}
            sampleData={sampleData}
            journey={journey}
            detectedSource={detectedSource}
            onSampleInstalled={onSampleInstalled}
            onContinue={() => {
              if (nextStepId !== undefined) {
                goToStep(nextStepId);
              }
            }}
          />
        );
      case 'explore':
      case 'dashboard':
        return (
          <LazyAnalyticsSetupStep
            stepId={currentStepId}
            sources={eventSources}
            totalSources={eventsState?.totalSources ?? eventSources.length}
            selectedSource={selectedSource}
            onSelectSource={selectSource}
            links={links}
            generation={generation}
          />
        );
      case 'search':
      case 'build':
        return <LazySearchSetupStep stepId={currentStepId} source={searchSource} links={links} />;
    }
  };

  // The first step gets its way onward from the data-detected callout, and none before that.
  const hasStepNavigation = stepId !== undefined && stepId !== 'connect';
  const isLastStep = nextStepId === undefined;

  const renderBody = (): React.JSX.Element => {
    if (state === undefined && isError) {
      return (
        <KibanaPageTemplate.Section
          paddingSize="xl"
          grow={false}
          data-test-subj="analyticsOnboardingErrorView"
        >
          <KbnWarningCallout
            announceOnMount
            data-test-subj="analyticsOnboardingError"
            title={i18n.translate('xpack.searchHomepage.analytics.onboarding.errorTitle', {
              defaultMessage: 'Unable to check this deployment for data',
            })}
            actionProps={{
              primary: {
                iconType: 'refresh',
                onClick: refetch,
                isLoading: isFetching,
                'data-test-subj': 'analyticsOnboardingRetry',
                'data-telemetry-id': `${ANALYTICS_TELEMETRY_PREFIX}-onboarding-retry`,
                children: i18n.translate('xpack.searchHomepage.analytics.onboarding.retryButton', {
                  defaultMessage: 'Try again',
                }),
              },
            }}
          />
          <EuiSpacer size="m" />
          <AddSourceButton
            page="onboarding"
            name="AddSource"
            emphasis="low"
            audience="all"
            links={links}
            label={i18n.translate('xpack.searchHomepage.analytics.onboarding.errorAddDataButton', {
              defaultMessage: 'Add data',
            })}
          />
        </KibanaPageTemplate.Section>
      );
    }
    if (stepId === undefined || stepCopy === undefined) {
      return (
        <KibanaPageTemplate.Section
          paddingSize="xl"
          grow={false}
          data-test-subj="analyticsOnboardingLoading"
        >
          <EuiSkeletonTitle
            size="s"
            isLoading
            contentAriaLabel={i18n.translate(
              'xpack.searchHomepage.analytics.onboarding.loadingLabel',
              { defaultMessage: 'Checking your deployment for data' }
            )}
          />
          <EuiSpacer size="l" />
          <EuiSkeletonRectangle
            width="100%"
            height={STEP_PLACEHOLDER_SIZE}
            borderRadius="m"
            isLoading
          />
        </KibanaPageTemplate.Section>
      );
    }
    return (
      <KibanaPageTemplate.Section
        paddingSize="xl"
        grow={false}
        data-test-subj={`analyticsOnboardingStep-${stepId}`}
      >
        <div css={readableLine}>
          <EuiTitle size="m">
            <h2 ref={stepHeadingRef} tabIndex={-1} css={focusTargetHeading}>
              {stepCopy.title}
            </h2>
          </EuiTitle>
          {stepCopy.description !== undefined && (
            <>
              <EuiSpacer size="xs" />
              <EuiText size="s" color="subdued">
                <p>{stepCopy.description}</p>
              </EuiText>
            </>
          )}
        </div>
        <EuiSpacer size="l" />
        <Suspense
          fallback={
            <EuiSkeletonRectangle
              width="100%"
              height={STEP_PLACEHOLDER_SIZE}
              borderRadius="m"
              isLoading
            />
          }
        >
          {renderStepContent(stepId)}
        </Suspense>
        {hasStepNavigation && (
          <>
            <EuiSpacer size="l" />
            <EuiFlexGroup
              justifyContent={previousStepId === undefined ? 'flexEnd' : 'spaceBetween'}
              responsive={false}
            >
              {previousStepId !== undefined && (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    iconType="chevronSingleLeft"
                    flush="left"
                    onClick={() => goToStep(previousStepId)}
                    data-test-subj="analyticsOnboardingBack"
                    data-telemetry-id={`${ANALYTICS_TELEMETRY_PREFIX}-onboarding-back`}
                  >
                    {i18n.translate('xpack.searchHomepage.analytics.onboarding.backButton', {
                      defaultMessage: 'Back',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                {isLastStep ? (
                  <EuiButton
                    onClick={links.openHome}
                    data-test-subj="analyticsOnboardingFinish"
                    data-telemetry-id={`${ANALYTICS_TELEMETRY_PREFIX}-onboarding-finish`}
                  >
                    {getNextLabel(undefined)}
                  </EuiButton>
                ) : (
                  <EuiButton
                    iconType="chevronSingleRight"
                    iconSide="right"
                    onClick={() => goToStep(nextStepId)}
                    data-test-subj="analyticsOnboardingNext"
                    data-telemetry-id={`${ANALYTICS_TELEMETRY_PREFIX}-onboarding-next`}
                  >
                    {getNextLabel(nextStepId)}
                  </EuiButton>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </KibanaPageTemplate.Section>
    );
  };

  return (
    <AnalyticsPageTemplate
      breadcrumb={i18n.translate('xpack.searchHomepage.analytics.onboarding.breadcrumb', {
        defaultMessage: 'Get started',
      })}
      data-test-subj="guidedSetupPage"
    >
      <KibanaPageTemplate.Section paddingSize="xl" grow={false} bottomBorder>
        <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween" gutterSize="m" wrap>
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h1 data-test-subj="analyticsOnboardingTitle">{getSetupTitle(journey)}</h1>
            </EuiTitle>
          </EuiFlexItem>
          {resolution?.alternative !== undefined && (
            <EuiFlexItem grow={false}>
              <JourneySwitch
                page="onboarding"
                alternative={resolution.alternative}
                onSwitch={onSwitchJourney}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        {stepId !== undefined && (
          <div css={stepProgress}>
            <EuiSpacer size="m" />
            <EuiText size="s" color="subdued" data-test-subj="analyticsOnboardingStepCount">
              <p>
                {i18n.translate('xpack.searchHomepage.analytics.onboarding.stepCount', {
                  defaultMessage: 'Step {step} of {stepCount}',
                  values: { step: stepIndex + 1, stepCount: ONBOARDING_STEP_COUNT },
                })}
              </p>
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiProgress
              value={stepIndex + 1}
              max={ONBOARDING_STEP_COUNT}
              size="s"
              color="primary"
              aria-hidden
              data-test-subj="analyticsOnboardingProgress"
            />
          </div>
        )}
      </KibanaPageTemplate.Section>
      {renderBody()}
    </AnalyticsPageTemplate>
  );
};
