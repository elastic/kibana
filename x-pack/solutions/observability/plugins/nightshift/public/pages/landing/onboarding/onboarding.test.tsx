/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import { NightshiftOnboarding } from './onboarding';

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({ services: {} }),
}));
jest.mock('../../../hooks/use_current_user_name', () => ({
  useCurrentUserName: () => 'Kate',
}));
jest.mock('../../../components/ui/flyout_share_url_button', () => ({
  useFlyoutShareUrlCustomAction: () => ({}),
}));
jest.mock('./use_onboarding', () => ({
  useOnboarding: () => ({
    data: { agent_installed: true, execution: { execution_id: 'exec-1', status: 'completed' } },
    isInitialLoading: false,
  }),
  useStartOnboardingSuggestions: () => ({ mutate: jest.fn(), isLoading: false }),
}));
jest.mock('../../../data/service_accounts/use_investigator_service_account', () => ({
  useInvestigatorServiceAccount: () => ({ data: {} }),
  isNightshiftSetUp: () => true,
}));
jest.mock('../header', () => ({ NightshiftHeader: () => null }));
jest.mock('./intro_banner', () => ({
  OnboardingIntroBanner: () => <div data-test-subj="introBannerStub" />,
}));
jest.mock('./nightshift_setup_prompt', () => ({
  NightshiftSetupPrompt: () => null,
}));
jest.mock('./connect_step', () => ({
  ...jest.requireActual('./connect_step'),
  OnboardingConnectStep: () => null,
}));
jest.mock('./first_investigation_step', () => ({
  OnboardingFirstInvestigationStep: () => null,
}));
jest.mock('./automation_step', () => ({ OnboardingAutomationStep: () => null }));

const STEP_IDS = ['enable', 'connect', 'investigate', 'automate'];

const linkedSteps = () =>
  STEP_IDS.filter((id) => screen.queryByTestId(`nightshiftOnboardingStepLink-${id}`));

const currentStep = () =>
  STEP_IDS.find(
    (id) =>
      screen.getByTestId(`nightshiftOnboardingStep-${id}`).getAttribute('aria-current') === 'step'
  );

describe('NightshiftOnboarding', () => {
  it('links only completed earlier steps and keeps the intro banner on the connect step', () => {
    render(
      <I18nProvider>
        <MemoryRouter>
          <NightshiftOnboarding
            latestInvestigation={{ id: 'inv-1' } as InvestigationSummary}
            onFinish={jest.fn()}
          />
        </MemoryRouter>
      </I18nProvider>
    );

    expect(currentStep()).toBe('automate');
    expect(linkedSteps()).toEqual(['connect', 'investigate']);
    expect(screen.queryByTestId('introBannerStub')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nightshiftOnboardingStepLink-investigate'));
    expect(currentStep()).toBe('investigate');
    expect(linkedSteps()).toEqual(['connect']);

    fireEvent.click(screen.getByTestId('nightshiftOnboardingStepLink-connect'));
    expect(currentStep()).toBe('connect');
    expect(linkedSteps()).toEqual([]);
    expect(screen.getByTestId('introBannerStub')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nightshiftOnboardingBackToSuggestionsButton'));
    expect(currentStep()).toBe('automate');
    expect(linkedSteps()).toEqual(['connect', 'investigate']);
  });
});
