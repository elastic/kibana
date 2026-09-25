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
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { coreMock } from '@kbn/core/public/mocks';
import { useWorkers } from '../hooks/use_workers_api';
import { useInvestigationsCount } from '../hooks/use_investigations_api';
import { LandingPage } from './landing_page';

jest.mock('../hooks/use_workers_api', () => ({
  useWorkers: jest.fn(),
  useUpdateWorker: jest.fn().mockReturnValue({ mutate: jest.fn(), isLoading: false }),
}));
jest.mock('../hooks/use_investigations_api');

// ConversationsPage has complex deps; stub it to keep the test focused on routing logic.
jest.mock('./conversations', () => ({
  ConversationsPage: () => <div data-test-subj="conversations-page" />,
}));

// OnboardingPage has router/kibana deps; keep it real but stub its layout deps.
jest.mock('../components/layout/alertzero_page_section', () => ({
  AlertZeroPageSection: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('../hooks/use_alertzero_doc_title', () => ({ useAlertZeroDocTitle: jest.fn() }));
jest.mock('../hooks/use_current_user', () => ({
  useCurrentUser: jest.fn().mockReturnValue(undefined),
}));

const mockUseWorkers = useWorkers as jest.Mock;
const mockUseInvestigationsCount = useInvestigationsCount as jest.Mock;
// useUpdateWorker is used by OnboardingPage (rendered when no workers are enabled);
// the mock above provides a no-op stub so OnboardingPage doesn't crash.

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

const investigationsResult = (total: number, overrides: QueryOverrides = {}) => ({
  data: total,
  isLoading: false,
  isFetching: false,
  error: undefined,
  ...overrides,
});

const wrap = (ui: React.ReactElement) => {
  const core = coreMock.createStart();
  const history = createMemoryHistory();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <I18nProvider>
      <EuiProvider>
        <QueryClientProvider client={queryClient}>
          <KibanaContextProvider services={core}>
            <Router history={history}>{ui}</Router>
          </KibanaContextProvider>
        </QueryClientProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

const renderPage = () => render(wrap(<LandingPage />));

beforeEach(() => {
  mockUseInvestigationsCount.mockReturnValue(investigationsResult(0));
  mockUseWorkers.mockReturnValue(workersResult([]));
});

afterEach(() => jest.clearAllMocks());

describe('LandingPage', () => {
  it('shows onboarding when there are no workers and no investigations', () => {
    mockUseWorkers.mockReturnValue(workersResult([]));

    renderPage();

    expect(screen.getByText('Enable your workers')).toBeInTheDocument();
    expect(screen.queryByTestId('conversations-page')).not.toBeInTheDocument();
  });

  it('shows onboarding when all workers are disabled and there are no investigations', () => {
    mockUseWorkers.mockReturnValue(workersResult([{ enabled: false }, { enabled: false }]));

    renderPage();

    expect(screen.getByText('Enable your workers')).toBeInTheDocument();
  });

  it('shows the queue when at least one worker is enabled', () => {
    mockUseWorkers.mockReturnValue(workersResult([{ enabled: false }, { enabled: true }]));

    renderPage();

    expect(screen.getByTestId('conversations-page')).toBeInTheDocument();
    expect(screen.queryByText('Enable your workers')).not.toBeInTheDocument();
  });

  it('shows the queue when investigations exist even with no workers enabled', () => {
    mockUseInvestigationsCount.mockReturnValue(investigationsResult(3));

    renderPage();

    expect(screen.getByTestId('conversations-page')).toBeInTheDocument();
    expect(screen.queryByText('Enable your workers')).not.toBeInTheDocument();
  });

  it('shows a loading spinner while workers are loading', () => {
    mockUseWorkers.mockReturnValue(workersResult([], { isLoading: true, data: undefined }));

    renderPage();

    expect(screen.queryByText('Enable your workers')).not.toBeInTheDocument();
    expect(screen.queryByTestId('conversations-page')).not.toBeInTheDocument();
    expect(document.querySelector('[class*="euiLoadingSpinner"]')).toBeInTheDocument();
  });

  it('shows the queue immediately when workers loaded with an enabled worker even if investigations are still loading', () => {
    mockUseWorkers.mockReturnValue(workersResult([{ enabled: true }]));
    mockUseInvestigationsCount.mockReturnValue(
      investigationsResult(0, { isLoading: true, data: undefined })
    );

    renderPage();

    expect(screen.getByTestId('conversations-page')).toBeInTheDocument();
    expect(document.querySelector('[class*="euiLoadingSpinner"]')).not.toBeInTheDocument();
  });

  it('shows the queue immediately on error even if sibling queries are still loading', () => {
    mockUseWorkers.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: new Error('network error'),
    });
    mockUseInvestigationsCount.mockReturnValue(
      investigationsResult(0, { isLoading: true, data: undefined })
    );

    renderPage();

    expect(screen.getByTestId('conversations-page')).toBeInTheDocument();
    expect(document.querySelector('[class*="euiLoadingSpinner"]')).not.toBeInTheDocument();
  });

  it('shows a loading spinner while investigations are loading', () => {
    mockUseInvestigationsCount.mockReturnValue(
      investigationsResult(0, { isLoading: true, data: undefined })
    );

    renderPage();

    expect(screen.queryByText('Enable your workers')).not.toBeInTheDocument();
    expect(screen.queryByTestId('conversations-page')).not.toBeInTheDocument();
    expect(document.querySelector('[class*="euiLoadingSpinner"]')).toBeInTheDocument();
  });

  it('shows a spinner when stale cached zeros are being refetched in the background', () => {
    // Simulates an established user whose cached data shows empty workers/investigations
    // but React Query is in a background refetch (isLoading=false, isFetching=true).
    mockUseWorkers.mockReturnValue(workersResult([], { isFetching: true }));
    mockUseInvestigationsCount.mockReturnValue(investigationsResult(0, { isFetching: true }));

    renderPage();

    expect(screen.queryByText('Enable your workers')).not.toBeInTheDocument();
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

    expect(screen.getByText('Enable your workers')).toBeInTheDocument();
    expect(screen.queryByTestId('conversations-page')).not.toBeInTheDocument();
  });

  it('falls through to the queue on workers fetch error', () => {
    mockUseWorkers.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: new Error('network error'),
    });

    renderPage();

    expect(screen.getByTestId('conversations-page')).toBeInTheDocument();
  });

  it('falls through to the queue on investigations fetch error', () => {
    mockUseInvestigationsCount.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: new Error('network error'),
    });

    renderPage();

    expect(screen.getByTestId('conversations-page')).toBeInTheDocument();
  });
});
