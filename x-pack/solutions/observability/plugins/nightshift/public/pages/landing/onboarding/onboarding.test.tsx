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
import { useConnectorsByType } from '../../../data/sandbox_connectors/use_connectors_by_type';
import { useOnboarding } from './use_onboarding';
import { NightshiftOnboarding } from './onboarding';

const mockStartSuggestions = jest.fn();

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
  useOnboarding: jest.fn(),
  useStartOnboardingSuggestions: () => ({ mutate: mockStartSuggestions, isLoading: false }),
}));
jest.mock('../../../data/service_accounts/use_investigator_service_account', () => ({
  useInvestigatorServiceAccount: () => ({ data: {} }),
  isNightshiftSetUp: () => true,
}));
jest.mock('../../../data/sandbox_connectors/use_connectors_by_type', () => ({
  useConnectorsByType: jest.fn(),
}));
jest.mock('../../../data/automations/use_automations', () => ({
  useFetchAutomations: () => ({
    data: { automations: [] },
    isInitialLoading: false,
    isError: false,
  }),
}));
jest.mock('../header', () => ({ NightshiftHeader: () => null }));
jest.mock('./intro_banner', () => ({
  OnboardingIntroBanner: () => <div data-test-subj="introBannerStub" />,
}));
jest.mock('./nightshift_setup_prompt', () => ({ NightshiftSetupPrompt: () => null }));
jest.mock('./add_data_step', () => ({
  ...jest.requireActual('./add_data_step'),
  OnboardingAddDataStep: () => <div data-test-subj="addDataStepStub" />,
}));
jest.mock('./connect_sources_step', () => ({
  ...jest.requireActual('./connect_sources_step'),
  OnboardingConnectSourcesStep: () => <div data-test-subj="connectSourcesStepStub" />,
}));
jest.mock('./first_investigation_step', () => ({
  OnboardingFirstInvestigationStep: () => null,
}));
jest.mock('./automation_step', () => ({ OnboardingAutomationStep: () => null }));

const STEP_IDS = ['enable', 'addData', 'connectSources', 'investigate', 'automate'];

/** Per sandbox-capable type: the connectors the agent has, and ones that only exist in the space. */
const mockConnectors = (
  assignedByType: Record<string, number>,
  unassignedByType: Record<string, number> = {}
) =>
  (useConnectorsByType as jest.Mock).mockReturnValue({
    groups: Object.keys({ ...unassignedByType, ...assignedByType }).map((id) => {
      const assigned = assignedByType[id] ?? 0;
      const total = assigned + (unassignedByType[id] ?? 0);
      return {
        actionType: { id },
        connectors: Array.from({ length: total }, (_, i) => ({ id: `${id}-${i}` })),
        assignedCount: assigned,
      };
    }),
    isLoading: false,
    error: null,
  });

/** The space is enabled; with `explored`, a first-investigations run exists. */
const mockOnboarding = ({ explored = false }: { explored?: boolean } = {}) =>
  (useOnboarding as jest.Mock).mockReturnValue({
    data: {
      agent_installed: true,
      ...(explored && { execution: { execution_id: 'exec-1', status: 'completed' } }),
    },
    isInitialLoading: false,
  });

const renderOnboarding = (latestInvestigation?: InvestigationSummary) =>
  render(
    <I18nProvider>
      <MemoryRouter>
        <NightshiftOnboarding onFinish={jest.fn()} latestInvestigation={latestInvestigation} />
      </MemoryRouter>
    </I18nProvider>
  );

const currentStep = () =>
  STEP_IDS.find(
    (id) =>
      screen.getByTestId(`nightshiftOnboardingStep-${id}`).getAttribute('aria-current') === 'step'
  );
const linkedSteps = () =>
  STEP_IDS.filter((id) => screen.queryByTestId(`nightshiftOnboardingStepLink-${id}`));
const stepsCard = () => screen.getByTestId('nightshiftOnboardingSteps');

describe('NightshiftOnboarding', () => {
  beforeEach(() => {
    mockOnboarding();
    mockStartSuggestions.mockReset();
  });

  describe('Add data step', () => {
    it('is titled Add data and has no Proceed until a telemetry source is connected', () => {
      mockConnectors({ '.elasticsearch': 0, '.new_relic': 0 });

      renderOnboarding();

      expect(currentStep()).toBe('addData');
      expect(screen.getByTestId('nightshiftOnboardingStepTitle')).toHaveTextContent('Add data');
      expect(screen.getByTestId('addDataStepStub')).toBeInTheDocument();
      expect(
        screen.queryByTestId('nightshiftOnboardingAddDataProceedButton')
      ).not.toBeInTheDocument();
      expect(linkedSteps()).toEqual([]);
    });

    it('ignores connectors that belong to the Connect other sources page', () => {
      mockConnectors({ '.elasticsearch': 0, '.http': 2, '.github': 1 });

      renderOnboarding();

      expect(
        screen.queryByTestId('nightshiftOnboardingAddDataProceedButton')
      ).not.toBeInTheDocument();
    });

    it('does not count a preconfigured connector the agent has not been given', () => {
      mockConnectors({ '.elasticsearch': 0 }, { '.elasticsearch': 1 });

      renderOnboarding();

      expect(
        screen.queryByTestId('nightshiftOnboardingAddDataProceedButton')
      ).not.toBeInTheDocument();
    });

    it('proceeds to Connect other sources once a telemetry connector exists', () => {
      mockConnectors({ '.elasticsearch': 0, '.new_relic': 1, '.http': 2 });

      renderOnboarding();
      fireEvent.click(screen.getByTestId('nightshiftOnboardingAddDataProceedButton'));

      expect(currentStep()).toBe('connectSources');
      expect(screen.getByTestId('nightshiftOnboardingStepTitle')).toHaveTextContent(
        'Connect other sources'
      );
      expect(screen.getByTestId('connectSourcesStepStub')).toBeInTheDocument();
      expect(screen.queryByTestId('addDataStepStub')).not.toBeInTheDocument();
    });
  });

  describe('Connect other sources step', () => {
    const goToSources = () => {
      renderOnboarding();
      fireEvent.click(screen.getByTestId('nightshiftOnboardingAddDataProceedButton'));
    };

    it('is optional while current and skippable while nothing is connected there', () => {
      mockConnectors({ '.new_relic': 1, '.http': 2, '.github': 0 }, { '.github': 1 });

      goToSources();

      expect(stepsCard()).toHaveTextContent('Optional');
      expect(
        screen.getByTestId('nightshiftOnboardingConnectSourcesProceedButton')
      ).toHaveTextContent('Skip this step');
    });

    it('proceeds once an additional source is connected', () => {
      mockConnectors({ '.new_relic': 1, '.github': 1 });

      goToSources();

      expect(
        screen.getByTestId('nightshiftOnboardingConnectSourcesProceedButton')
      ).toHaveTextContent('Proceed');
    });

    it('starts looking for first investigations either way', () => {
      mockConnectors({ '.new_relic': 1, '.github': 0 });

      goToSources();
      fireEvent.click(screen.getByTestId('nightshiftOnboardingConnectSourcesProceedButton'));

      expect(mockStartSuggestions).toHaveBeenCalledTimes(1);
    });

    it('links back to Add data instead of offering a Back button', () => {
      mockConnectors({ '.new_relic': 1, '.github': 0 });

      goToSources();

      expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
      expect(linkedSteps()).toEqual(['addData']);
      fireEvent.click(screen.getByTestId('nightshiftOnboardingStepLink-addData'));
      expect(currentStep()).toBe('addData');
      expect(stepsCard()).not.toHaveTextContent('Optional');
    });

    it('links forward again from Add data before any run, since Proceed is available', () => {
      mockConnectors({ '.new_relic': 1, '.github': 0 });

      goToSources();
      fireEvent.click(screen.getByTestId('nightshiftOnboardingStepLink-addData'));

      expect(linkedSteps()).toEqual(['connectSources']);
      fireEvent.click(screen.getByTestId('nightshiftOnboardingStepLink-connectSources'));
      expect(currentStep()).toBe('connectSources');
      expect(mockStartSuggestions).not.toHaveBeenCalled();
    });
  });

  describe('while suggestions are shown, before any investigation', () => {
    beforeEach(() => {
      mockOnboarding({ explored: true });
      mockConnectors({ '.new_relic': 1, '.github': 0 });
    });

    it('does not let the user jump ahead to Create first automation', () => {
      renderOnboarding();

      expect(currentStep()).toBe('investigate');
      expect(linkedSteps()).toEqual(['addData', 'connectSources']);
    });

    it('links back to Try first investigation from a detour', () => {
      renderOnboarding();

      fireEvent.click(screen.getByTestId('nightshiftOnboardingStepLink-connectSources'));
      expect(currentStep()).toBe('connectSources');
      expect(linkedSteps()).toEqual(['addData', 'investigate']);

      fireEvent.click(screen.getByTestId('nightshiftOnboardingStepLink-addData'));
      expect(currentStep()).toBe('addData');
      expect(linkedSteps()).toEqual(['connectSources', 'investigate']);

      fireEvent.click(screen.getByTestId('nightshiftOnboardingStepLink-investigate'));
      expect(currentStep()).toBe('investigate');
    });
  });

  describe('after the first investigation', () => {
    const investigation = { id: 'inv-1' } as InvestigationSummary;

    beforeEach(() => {
      mockOnboarding({ explored: true });
      mockConnectors({ '.new_relic': 1, '.github': 0 });
    });

    it('links every completed step except Enable, without Back or Back to suggestions', () => {
      renderOnboarding(investigation);

      expect(currentStep()).toBe('automate');
      expect(linkedSteps()).toEqual(['addData', 'connectSources', 'investigate']);
      expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
      expect(screen.queryByText('Back to suggestions')).not.toBeInTheDocument();
    });

    it('keeps the intro banner on Add data and Connect other sources, not on later steps', () => {
      renderOnboarding(investigation);

      expect(screen.queryByTestId('introBannerStub')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('nightshiftOnboardingStepLink-connectSources'));
      expect(screen.getByTestId('introBannerStub')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('nightshiftOnboardingStepLink-addData'));
      expect(screen.getByTestId('introBannerStub')).toBeInTheDocument();
    });

    it('returns to a completed step and forward again through the card, not by rerunning', () => {
      renderOnboarding(investigation);

      fireEvent.click(screen.getByTestId('nightshiftOnboardingStepLink-connectSources'));
      expect(currentStep()).toBe('connectSources');
      expect(linkedSteps()).toEqual(['addData', 'investigate']);
      expect(screen.queryByText('Back to suggestions')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('nightshiftOnboardingConnectSourcesProceedButton'));
      expect(mockStartSuggestions).not.toHaveBeenCalled();
      expect(currentStep()).toBe('automate');
    });
  });
});
