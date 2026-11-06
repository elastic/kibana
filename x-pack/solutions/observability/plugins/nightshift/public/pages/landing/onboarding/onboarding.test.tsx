/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { useConnectorsByType } from '../../../data/sandbox_connectors/use_connectors_by_type';
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
  useOnboarding: () => ({ data: { agent_installed: true }, isInitialLoading: false }),
  useStartOnboardingSuggestions: () => ({ mutate: jest.fn(), isLoading: false }),
}));
jest.mock('../../../data/service_accounts/use_investigator_service_account', () => ({
  useInvestigatorServiceAccount: () => ({ data: {} }),
  isNightshiftSetUp: () => true,
}));
jest.mock('../../../data/sandbox_connectors/use_connectors_by_type', () => ({
  useConnectorsByType: jest.fn(),
}));
jest.mock('../header', () => ({ NightshiftHeader: () => null }));
jest.mock('./intro_banner', () => ({ OnboardingIntroBanner: () => null }));
jest.mock('./nightshift_setup_prompt', () => ({ NightshiftSetupPrompt: () => null }));
jest.mock('./connect_step', () => ({
  ...jest.requireActual('./connect_step'),
  OnboardingConnectStep: () => null,
}));
jest.mock('./first_investigation_step', () => ({
  OnboardingFirstInvestigationStep: () => null,
}));
jest.mock('./automation_step', () => ({ OnboardingAutomationStep: () => null }));

/** Connector counts per sandbox-capable type in the space. */
const mockConnectors = (countByType: Record<string, number>) =>
  (useConnectorsByType as jest.Mock).mockReturnValue({
    groups: Object.entries(countByType).map(([id, count]) => ({
      actionType: { id },
      connectors: Array.from({ length: count }, (_, i) => ({ id: `${id}-${i}` })),
    })),
    isLoading: false,
    error: null,
  });

const renderOnboarding = () =>
  render(
    <I18nProvider>
      <MemoryRouter>
        <NightshiftOnboarding onFinish={jest.fn()} />
      </MemoryRouter>
    </I18nProvider>
  );

describe('NightshiftOnboarding', () => {
  describe('Add data step', () => {
    it('has no Proceed until a telemetry source is connected', () => {
      mockConnectors({ '.elasticsearch': 0, '.new_relic': 0 });

      renderOnboarding();

      expect(screen.getByTestId('nightshiftOnboardingStep-connect')).toHaveAttribute(
        'aria-current',
        'step'
      );
      expect(screen.queryByTestId('nightshiftOnboardingContinueButton')).not.toBeInTheDocument();
    });

    it('ignores connectors that belong to the Connect other sources page', () => {
      mockConnectors({ '.elasticsearch': 0, '.http': 2, '.github': 1 });

      renderOnboarding();

      expect(screen.queryByTestId('nightshiftOnboardingContinueButton')).not.toBeInTheDocument();
    });

    it('offers Proceed once a telemetry connector exists', () => {
      mockConnectors({ '.elasticsearch': 0, '.new_relic': 1, '.http': 2 });

      renderOnboarding();

      expect(screen.getByTestId('nightshiftOnboardingContinueButton')).toHaveTextContent('Proceed');
    });
  });
});
