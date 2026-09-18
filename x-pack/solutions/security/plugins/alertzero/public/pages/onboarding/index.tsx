/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButton, EuiEmptyPrompt, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { AlertZeroPageSection } from '../../components/layout/alertzero_page_section';
import { useAlertZeroDocTitle } from '../../hooks/use_alertzero_doc_title';
import { useEnableOnboarding, useOnboardingState } from '../../hooks/use_onboarding_state';
import { AwaitingFirstRun } from './components/awaiting_first_run';
import { DisabledCta } from './components/disabled_cta';
import { NoWatches } from './components/no_watches';
import * as i18n from './translations';

/** Onboarding complete — a run exists, so the derived states no longer apply. */
const OnboardingComplete: React.FC = () => {
  const history = useHistory();
  return (
    <AlertZeroPageSection>
      <EuiEmptyPrompt
        data-test-subj="alertZeroOnboardingCompletePage"
        iconType="check"
        title={<h2>{i18n.ACTIVE_TITLE}</h2>}
        body={<p>{i18n.ACTIVE_BODY}</p>}
        actions={
          <EuiButton fill onClick={() => history.push('/')}>
            {i18n.ACTIVE_CTA}
          </EuiButton>
        }
      />
    </AlertZeroPageSection>
  );
};

/**
 * Landing page for the onboarding flow. It renders nothing of its own besides a routing decision —
 * every screen is a pure function of the derived state from {@link useOnboardingState}.
 */
export const OnboardingPage: React.FC = () => {
  useAlertZeroDocTitle(i18n.ONBOARDING_TITLE);
  const onboarding = useOnboardingState();
  const enable = useEnableOnboarding();

  // S0 renders immediately: it depends only on the advanced setting, not on watches/proposals.
  if (onboarding.state === 'disabled') {
    return (
      <DisabledCta
        enabled={onboarding.enabled}
        canToggle={onboarding.canToggle}
        isEnabling={enable.isLoading}
        isError={enable.isError}
        onEnable={() => enable.mutate()}
      />
    );
  }

  if (onboarding.isLoading) {
    return (
      <AlertZeroPageSection>
        <EuiEmptyPrompt
          icon={<EuiLoadingSpinner size="xl" />}
          body={
            <EuiText color="subdued" size="s">
              <p>{i18n.ONBOARDING_LOADING}</p>
            </EuiText>
          }
        />
      </AlertZeroPageSection>
    );
  }

  switch (onboarding.state) {
    case 'no-watches':
      return <NoWatches />;
    case 'awaiting-first-run':
      return <AwaitingFirstRun />;
    case 'active':
      return <OnboardingComplete />;
  }
};
