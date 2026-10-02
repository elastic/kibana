/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { coreMock } from '@kbn/core/public/mocks';
import {
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
} from '@kbn/alertzero-common';
import { queryKeys } from '../query_keys';
import { useWorkers } from '../hooks/use_workers_api';
import { useInvestigationsCount } from '../hooks/use_investigations_api';
import { LandingPage } from './landing_page';

jest.mock('../hooks/use_workers_api', () => ({
  useWorkers: jest.fn(),
  useUpdateWorker: jest.fn().mockReturnValue({ mutate: jest.fn(), isLoading: false }),
  notifyWorkerUpdateError: jest.fn(),
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
jest.mock('../components/scan_failure_callout/scan_failure_callout', () => ({
  ScanFailureCallout: () => <div data-test-subj="alertZeroScanFailureCallout" />,
}));
jest.mock('../hooks/use_alertzero_doc_title', () => ({ useAlertZeroDocTitle: jest.fn() }));
jest.mock('../hooks/use_current_user', () => ({
  useCurrentUser: jest.fn().mockReturnValue(undefined),
}));

const mockUseWorkers = useWorkers as jest.Mock;
const mockUseInvestigationsCount = useInvestigationsCount as jest.Mock;
// useUpdateWorker mock above is kept for completeness; OnboardingPage no longer calls it.

const ALL_ONBOARDING_WORKER_IDS = [
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
];

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
  it('mounts the scan-failure callout on onboarding', () => {
    renderPage();

    expect(screen.getByTestId('alertZeroScanFailureCallout')).toBeInTheDocument();
  });

  it('shows onboarding when there are no workers and no investigations', () => {
    mockUseWorkers.mockReturnValue(workersResult([]));

    renderPage();

    expect(screen.getByText("Let's turn on the Watches?")).toBeInTheDocument();
    expect(screen.queryByTestId('conversations-page')).not.toBeInTheDocument();
  });

  it('shows onboarding when all workers are disabled and there are no investigations', () => {
    mockUseWorkers.mockReturnValue(workersResult([{ enabled: false }, { enabled: false }]));

    renderPage();

    expect(screen.getByText("Let's turn on the Watches?")).toBeInTheDocument();
  });

  it('shows the queue when at least one worker is enabled', () => {
    mockUseWorkers.mockReturnValue(workersResult([{ enabled: false }, { enabled: true }]));

    renderPage();

    expect(screen.getByTestId('conversations-page')).toBeInTheDocument();
    expect(screen.queryByText("Let's turn on the Watches?")).not.toBeInTheDocument();
  });

  it('shows the queue when investigations exist even with no workers enabled', () => {
    mockUseInvestigationsCount.mockReturnValue(investigationsResult(3));

    renderPage();

    expect(screen.getByTestId('conversations-page')).toBeInTheDocument();
    expect(screen.queryByText("Let's turn on the Watches?")).not.toBeInTheDocument();
  });

  it('shows a loading spinner while workers are loading', () => {
    mockUseWorkers.mockReturnValue(workersResult([], { isLoading: true, data: undefined }));

    renderPage();

    expect(screen.queryByText("Let's turn on the Watches?")).not.toBeInTheDocument();
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

    expect(screen.queryByText("Let's turn on the Watches?")).not.toBeInTheDocument();
    expect(screen.queryByTestId('conversations-page')).not.toBeInTheDocument();
    expect(document.querySelector('[class*="euiLoadingSpinner"]')).toBeInTheDocument();
  });

  it('shows a spinner when stale cached zeros are being refetched in the background', () => {
    // Simulates an established user whose cached data shows empty workers/investigations
    // but React Query is in a background refetch (isLoading=false, isFetching=true).
    mockUseWorkers.mockReturnValue(workersResult([], { isFetching: true }));
    mockUseInvestigationsCount.mockReturnValue(investigationsResult(0, { isFetching: true }));

    renderPage();

    expect(screen.queryByText("Let's turn on the Watches?")).not.toBeInTheDocument();
    expect(screen.queryByTestId('conversations-page')).not.toBeInTheDocument();
    expect(document.querySelector('[class*="euiLoadingSpinner"]')).toBeInTheDocument();
  });

  it('transitions to the queue when a worker becomes enabled while onboarding is shown', () => {
    // Phase 1: no workers enabled — onboarding is shown.
    mockUseWorkers.mockReturnValue(workersResult([]));
    const { rerender } = render(wrap(<LandingPage />));

    expect(screen.getByText("Let's turn on the Watches?")).toBeInTheDocument();

    // Phase 2: another admin enables a worker — page should transition without a reload.
    mockUseWorkers.mockReturnValue(workersResult([{ enabled: true }]));
    rerender(wrap(<LandingPage />));

    expect(screen.getByTestId('conversations-page')).toBeInTheDocument();
    expect(screen.queryByText("Let's turn on the Watches?")).not.toBeInTheDocument();
  });

  it('does not transition to the queue when a background refetch returns partial state mid-save', async () => {
    // Seed useWorkers with the full catalog so OnboardingPage shows all toggles and
    // the Enable button is active. (workersResult uses sequential w-N IDs; supply
    // the real catalog IDs so the worker intersection in OnboardingPage matches.)
    mockUseWorkers.mockReturnValue({
      data: { workers: ALL_ONBOARDING_WORKER_IDS.map((id) => ({ id, enabled: false })) },
      isLoading: false,
      isFetching: false,
      error: undefined,
    });
    mockUseInvestigationsCount.mockReturnValue(investigationsResult(0));

    // Use a custom queryClient and core so we can keep PATCHes in-flight.
    interface Settler {
      resolve: () => void;
      reject: (err: Error) => void;
    }
    const settlers: Settler[] = [];
    const httpPatch = jest.fn().mockImplementation(
      () =>
        new Promise<void>((resolve, reject) => {
          settlers.push({ resolve: () => resolve(), reject: (err) => reject(err) });
        })
    );
    const coreStart = coreMock.createStart();
    (coreStart.application.capabilities as Record<string, unknown>).alertzero = { write: true };
    const core = { ...coreStart, http: { ...coreStart.http, patch: httpPatch } };
    const history = createMemoryHistory();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    // Seed the workers cache so useEnableWorkers can filter IDs on the first click.
    queryClient.setQueryData(queryKeys.workers.list(), {
      workers: ALL_ONBOARDING_WORKER_IDS.map((id) => ({ id, enabled: false })),
    });

    // Build the element as a factory so each call produces a distinct React element.
    // Passing the same object reference to rerender can allow React to skip
    // reconciliation, preventing the component from seeing the updated mock value.
    const makeUI = () => (
      <I18nProvider>
        <EuiProvider>
          <QueryClientProvider client={queryClient}>
            <KibanaContextProvider services={core}>
              <Router history={history}>
                <LandingPage />
              </Router>
            </KibanaContextProvider>
          </QueryClientProvider>
        </EuiProvider>
      </I18nProvider>
    );

    const { rerender } = render(makeUI());

    expect(screen.getByText("Let's turn on the Watches?")).toBeInTheDocument();

    // Start the save — this calls onSavingChange(true) in LandingPage.
    fireEvent.click(screen.getByRole('button', { name: 'Enable and run' }));

    // Wait until all five PATCHes are in-flight (button becomes disabled).
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Enable and run' })).toHaveAttribute('disabled')
    );
    expect(httpPatch).toHaveBeenCalledTimes(5);

    // Simulate a window-focus refetch returning a partially-committed enabled worker.
    // Construct a fresh element tree for rerender so React reconciles from the new root
    // and LandingPage reads the updated mock return value.
    mockUseWorkers.mockReturnValue({
      data: { workers: [{ id: ALL_ONBOARDING_WORKER_IDS[0], enabled: true }] },
      isLoading: false,
      isFetching: false,
      error: undefined,
    });
    rerender(makeUI());

    // LandingPage must not unmount OnboardingPage while savingInProgress=true, even
    // though showQueue would otherwise be true.
    expect(screen.getByText("Let's turn on the Watches?")).toBeInTheDocument();
    expect(screen.queryByTestId('conversations-page')).not.toBeInTheDocument();

    // Settle the fan-out with a mixed outcome: 4 succeed, 1 fails.
    // This exercises the partial-failure path where onSavingChange(false) is
    // withheld, keeping savingInProgress=true and onboarding mounted for retry.
    settlers.slice(0, 4).forEach(({ resolve }) => resolve());
    settlers[4].reject(new Error('network error'));

    // Wait for the save to settle (isSaving clears, button re-enables).
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Enable and run' })).not.toHaveAttribute('disabled')
    );

    // Partial failure must keep onboarding mounted: the parent save lock is not
    // released, so the partially-committed server state (one enabled worker) cannot
    // transition the page to the queue.
    expect(screen.getByText("Let's turn on the Watches?")).toBeInTheDocument();
    expect(screen.queryByTestId('conversations-page')).not.toBeInTheDocument();
  });

  it('releases the save lock on total failure so a subsequent worker enable can transition normally', async () => {
    mockUseWorkers.mockReturnValue({
      data: { workers: ALL_ONBOARDING_WORKER_IDS.map((id) => ({ id, enabled: false })) },
      isLoading: false,
      isFetching: false,
      error: undefined,
    });
    mockUseInvestigationsCount.mockReturnValue(investigationsResult(0));

    const settlers: Array<{ reject: (err: Error) => void }> = [];
    const httpPatch = jest.fn().mockImplementation(
      () =>
        new Promise<void>((_, reject) => {
          settlers.push({ reject: (err) => reject(err) });
        })
    );
    const coreStart = coreMock.createStart();
    (coreStart.application.capabilities as Record<string, unknown>).alertzero = { write: true };
    const core = { ...coreStart, http: { ...coreStart.http, patch: httpPatch } };
    const history = createMemoryHistory();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(queryKeys.workers.list(), {
      workers: ALL_ONBOARDING_WORKER_IDS.map((id) => ({ id, enabled: false })),
    });

    const makeUI = () => (
      <I18nProvider>
        <EuiProvider>
          <QueryClientProvider client={queryClient}>
            <KibanaContextProvider services={core}>
              <Router history={history}>
                <LandingPage />
              </Router>
            </KibanaContextProvider>
          </QueryClientProvider>
        </EuiProvider>
      </I18nProvider>
    );

    const { rerender } = render(makeUI());
    expect(screen.getByText("Let's turn on the Watches?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Enable and run' }));

    // Wait for all PATCHes to be in-flight.
    await waitFor(() => expect(httpPatch).toHaveBeenCalledTimes(5));

    // All PATCHes fail — total failure, nothing committed server-side.
    settlers.forEach(({ reject }) => reject(new Error('network error')));

    // Wait for the save to settle (button re-enables).
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Enable and run' })).not.toHaveAttribute('disabled')
    );

    // On total failure, onSavingChange(false) must be called, releasing the lock.
    // Simulate a background refetch returning an enabled worker: the queue should
    // now be reachable (savingInProgress is false).
    mockUseWorkers.mockReturnValue({
      data: { workers: [{ id: ALL_ONBOARDING_WORKER_IDS[0], enabled: true }] },
      isLoading: false,
      isFetching: false,
      error: undefined,
    });
    rerender(makeUI());

    expect(screen.getByTestId('conversations-page')).toBeInTheDocument();
    expect(screen.queryByText("Let's turn on the Watches?")).not.toBeInTheDocument();
  });

  it('transitions from queue to onboarding when stale positive cache is corrected by a fresh empty response', () => {
    // Phase 1: stale cache shows an enabled worker while refetching — queue shown optimistically.
    mockUseWorkers.mockReturnValue(workersResult([{ enabled: true }], { isFetching: true }));
    const { rerender } = render(wrap(<LandingPage />));

    expect(screen.getByTestId('conversations-page')).toBeInTheDocument();

    // Phase 2: fresh response arrives — worker disabled, nothing fetching.
    mockUseWorkers.mockReturnValue(workersResult([{ enabled: false }]));
    rerender(wrap(<LandingPage />));

    expect(screen.getByText("Let's turn on the Watches?")).toBeInTheDocument();
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
