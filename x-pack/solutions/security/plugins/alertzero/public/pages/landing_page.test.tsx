/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { useWorkers } from '../hooks/use_workers_api';
import { useProposalsByCategoryCount, useClosedProposalsCount } from '../hooks/use_proposals_api';
import { LandingPage } from './landing_page';

jest.mock('../hooks/use_workers_api');
jest.mock('../hooks/use_proposals_api');

// ConversationsPage has complex deps; stub it to keep the test focused on routing logic.
jest.mock('./conversations', () => ({
  ConversationsPage: () => <div data-test-subj="conversations-page" />,
}));

// OnboardingPage has router/kibana deps; keep it real but stub its layout deps.
jest.mock('../components/layout/alertzero_page_section', () => ({
  AlertZeroPageSection: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('../hooks/use_alertzero_doc_title', () => ({ useAlertZeroDocTitle: jest.fn() }));

const mockUseWorkers = useWorkers as jest.Mock;
const mockUseProposalsByCategoryCount = useProposalsByCategoryCount as jest.Mock;
const mockUseClosedProposalsCount = useClosedProposalsCount as jest.Mock;

type QueryOverrides = Partial<{
  data: unknown;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | undefined;
}>;

const workersResult = (workers: Array<{ enabled: boolean }>, overrides: QueryOverrides = {}) => ({
  data: { workers: workers.map((w, i) => ({ id: `w-${i}`, ...w })) },
  isLoading: false,
  isFetching: false,
  error: undefined,
  ...overrides,
});

const proposalsResult = (total: number, overrides: QueryOverrides = {}) => ({
  data: { proposals: [], total },
  isLoading: false,
  isFetching: false,
  error: undefined,
  ...overrides,
});

const wrap = (ui: React.ReactElement) => {
  const core = coreMock.createStart();
  const history = createMemoryHistory();
  return (
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={core}>
          <Router history={history}>{ui}</Router>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

const renderPage = () => render(wrap(<LandingPage />));

beforeEach(() => {
  mockUseProposalsByCategoryCount.mockReturnValue(proposalsResult(0));
  mockUseClosedProposalsCount.mockReturnValue(proposalsResult(0));
  mockUseWorkers.mockReturnValue(workersResult([]));
});

afterEach(() => jest.clearAllMocks());

describe('LandingPage', () => {
  it('shows onboarding when there are no workers and no investigations', () => {
    mockUseWorkers.mockReturnValue(workersResult([]));
    mockUseProposalsByCategoryCount.mockReturnValue(proposalsResult(0));

    renderPage();

    expect(screen.getByText('Get started with AlertZero')).toBeInTheDocument();
    expect(screen.queryByTestId('conversations-page')).not.toBeInTheDocument();
  });

  it('shows onboarding when all workers are disabled and there are no investigations', () => {
    mockUseWorkers.mockReturnValue(workersResult([{ enabled: false }, { enabled: false }]));
    mockUseProposalsByCategoryCount.mockReturnValue(proposalsResult(0));

    renderPage();

    expect(screen.getByText('Get started with AlertZero')).toBeInTheDocument();
  });

  it('shows the queue when at least one worker is enabled', () => {
    mockUseWorkers.mockReturnValue(workersResult([{ enabled: false }, { enabled: true }]));
    mockUseProposalsByCategoryCount.mockReturnValue(proposalsResult(0));

    renderPage();

    expect(screen.getByTestId('conversations-page')).toBeInTheDocument();
    expect(screen.queryByText('Get started with AlertZero')).not.toBeInTheDocument();
  });

  it('shows the queue when investigations exist even with no workers enabled', () => {
    mockUseWorkers.mockReturnValue(workersResult([]));
    mockUseProposalsByCategoryCount.mockImplementation((category: string) =>
      proposalsResult(category === 'investigate' ? 3 : 0)
    );

    renderPage();

    expect(screen.getByTestId('conversations-page')).toBeInTheDocument();
    expect(screen.queryByText('Get started with AlertZero')).not.toBeInTheDocument();
  });

  it('shows the queue when respond proposals exist', () => {
    mockUseWorkers.mockReturnValue(workersResult([]));
    mockUseProposalsByCategoryCount.mockImplementation((category: string) =>
      proposalsResult(category === 'respond' ? 1 : 0)
    );

    renderPage();

    expect(screen.getByTestId('conversations-page')).toBeInTheDocument();
  });

  it('shows the queue when configure proposals exist', () => {
    mockUseWorkers.mockReturnValue(workersResult([]));
    mockUseProposalsByCategoryCount.mockImplementation((category: string) =>
      proposalsResult(category === 'configure' ? 2 : 0)
    );

    renderPage();

    expect(screen.getByTestId('conversations-page')).toBeInTheDocument();
    expect(screen.queryByText('Get started with AlertZero')).not.toBeInTheDocument();
  });

  it('shows a loading spinner while workers are loading', () => {
    mockUseWorkers.mockReturnValue(workersResult([], { isLoading: true, data: undefined }));

    renderPage();

    expect(screen.queryByText('Get started with AlertZero')).not.toBeInTheDocument();
    expect(screen.queryByTestId('conversations-page')).not.toBeInTheDocument();
    expect(document.querySelector('[class*="euiLoadingSpinner"]')).toBeInTheDocument();
  });

  it('shows the queue immediately when workers loaded with an enabled worker even if proposals are still loading', () => {
    mockUseWorkers.mockReturnValue(workersResult([{ enabled: true }]));
    mockUseProposalsByCategoryCount.mockReturnValue(
      proposalsResult(0, { isLoading: true, data: undefined })
    );

    renderPage();

    expect(screen.getByTestId('conversations-page')).toBeInTheDocument();
    expect(document.querySelector('[class*="euiLoadingSpinner"]')).not.toBeInTheDocument();
  });

  it('shows the queue immediately on error even if sibling queries are still loading', () => {
    mockUseWorkers.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('network error'),
    });
    mockUseProposalsByCategoryCount.mockReturnValue(
      proposalsResult(0, { isLoading: true, data: undefined })
    );

    renderPage();

    expect(screen.getByTestId('conversations-page')).toBeInTheDocument();
    expect(document.querySelector('[class*="euiLoadingSpinner"]')).not.toBeInTheDocument();
  });

  it('shows a loading spinner while proposals are loading', () => {
    mockUseProposalsByCategoryCount.mockReturnValue(
      proposalsResult(0, { isLoading: true, data: undefined })
    );

    renderPage();

    expect(screen.queryByText('Get started with AlertZero')).not.toBeInTheDocument();
    expect(screen.queryByTestId('conversations-page')).not.toBeInTheDocument();
    expect(document.querySelector('[class*="euiLoadingSpinner"]')).toBeInTheDocument();
  });

  it('shows a spinner when stale cached zeros are being refetched in the background', () => {
    // Simulates an established user whose cached data shows empty workers/proposals
    // but React Query is in a background refetch (isLoading=false, isFetching=true).
    mockUseWorkers.mockReturnValue(workersResult([], { isFetching: true }));
    mockUseProposalsByCategoryCount.mockReturnValue(proposalsResult(0, { isFetching: true }));

    renderPage();

    expect(screen.queryByText('Get started with AlertZero')).not.toBeInTheDocument();
    expect(screen.queryByTestId('conversations-page')).not.toBeInTheDocument();
    expect(document.querySelector('[class*="euiLoadingSpinner"]')).toBeInTheDocument();
  });

  it('transitions from queue to onboarding when stale positive cache is corrected by a fresh empty response', () => {
    // Phase 1: stale cache shows an enabled worker while refetching — queue shown optimistically.
    mockUseWorkers.mockReturnValue(workersResult([{ enabled: true }], { isFetching: true }));
    const { rerender } = render(wrap(<LandingPage />));

    expect(screen.getByTestId('conversations-page')).toBeInTheDocument();

    // Phase 2: fresh response arrives — worker disabled, nothing fetching.
    mockUseWorkers.mockReturnValue(workersResult([{ enabled: false }]));
    rerender(wrap(<LandingPage />));

    expect(screen.getByText('Get started with AlertZero')).toBeInTheDocument();
    expect(screen.queryByTestId('conversations-page')).not.toBeInTheDocument();
  });

  it('shows the queue when closed proposals exist even with no workers enabled', () => {
    mockUseWorkers.mockReturnValue(workersResult([]));
    mockUseClosedProposalsCount.mockReturnValue(proposalsResult(5));

    renderPage();

    expect(screen.getByTestId('conversations-page')).toBeInTheDocument();
    expect(screen.queryByText('Get started with AlertZero')).not.toBeInTheDocument();
  });

  it('shows a loading spinner while closed proposals are loading', () => {
    mockUseClosedProposalsCount.mockReturnValue(
      proposalsResult(0, { isLoading: true, data: undefined })
    );

    renderPage();

    expect(screen.queryByText('Get started with AlertZero')).not.toBeInTheDocument();
    expect(screen.queryByTestId('conversations-page')).not.toBeInTheDocument();
    expect(document.querySelector('[class*="euiLoadingSpinner"]')).toBeInTheDocument();
  });

  it('falls through to the queue on workers fetch error', () => {
    mockUseWorkers.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('network error'),
    });

    renderPage();

    expect(screen.getByTestId('conversations-page')).toBeInTheDocument();
  });

  it('falls through to the queue on proposals fetch error', () => {
    mockUseWorkers.mockReturnValue(workersResult([]));
    mockUseProposalsByCategoryCount.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('network error'),
    });

    renderPage();

    expect(screen.getByTestId('conversations-page')).toBeInTheDocument();
  });

  it('falls through to the queue on closed proposals fetch error', () => {
    mockUseWorkers.mockReturnValue(workersResult([]));
    mockUseClosedProposalsCount.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('network error'),
    });

    renderPage();

    expect(screen.getByTestId('conversations-page')).toBeInTheDocument();
  });
});
