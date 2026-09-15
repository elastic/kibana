/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from '@kbn/shared-ux-router';
import { AlertZeroRoutes } from '../../routes';
import { useOnboardingState } from '../../hooks/use_onboarding_state';

jest.mock('../../hooks/use_onboarding_state', () => ({
  useOnboardingState: jest.fn(),
}));

// Keep this spec focused on the gate decision; every routed page renders a trivial marker.
jest.mock('../conversations', () => ({
  ConversationsPage: () => <div>conversations</div>,
}));
jest.mock('../chats', () => ({ ChatsPage: () => <div>chats</div> }));
jest.mock('../settings', () => ({ SettingsPage: () => <div>settings</div> }));
jest.mock('../watches/routes', () => ({ WatchesRoutes: () => <div>watches</div> }));
jest.mock('../investigations/investigation_detail', () => ({
  InvestigationDetailPage: () => <div>investigation</div>,
}));
jest.mock('.', () => ({ OnboardingPage: () => <div>onboarding</div> }));
jest.mock('../../components/placeholder_page', () => ({
  PlaceholderPage: ({ title }: { title: string }) => <div>placeholder:{title}</div>,
}));

const mockUseOnboardingState = jest.mocked(useOnboardingState);

const renderRoutes = (state: string, path = '/') => {
  mockUseOnboardingState.mockReturnValue({ state } as unknown as ReturnType<
    typeof useOnboardingState
  >);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AlertZeroRoutes />
    </MemoryRouter>
  );
};

describe('OnboardingGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('S0 (disabled) gates the whole app behind the enable CTA', () => {
    renderRoutes('disabled', '/watches');
    expect(screen.getByText('onboarding')).toBeInTheDocument();
    expect(screen.queryByText('watches')).not.toBeInTheDocument();
  });

  it('S1 (no-watches) keeps the onboarding empty state — there is no catalog page to land on', () => {
    renderRoutes('no-watches', '/watches');
    expect(screen.getByText('onboarding')).toBeInTheDocument();
    expect(screen.queryByText('watches')).not.toBeInTheDocument();
  });

  it('S2 (awaiting-first-run) renders the real app surface (watch detail)', () => {
    renderRoutes('awaiting-first-run', '/watches');
    expect(screen.getByText('watches')).toBeInTheDocument();
    expect(screen.queryByText('onboarding')).not.toBeInTheDocument();
  });

  it('active renders the real app surface', () => {
    renderRoutes('active', '/');
    expect(screen.getByText('conversations')).toBeInTheDocument();
    expect(screen.queryByText('onboarding')).not.toBeInTheDocument();
  });
});
