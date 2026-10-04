/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
} from '@kbn/alertzero-common';
import { SECURITY_APP_ID } from '@kbn/deeplinks-security';
import { queryKeys } from '../../query_keys';
import { ONBOARDING_READ_MORE_URL_PLACEHOLDER } from './constants';
import { OnboardingPage } from './onboarding_page';

jest.mock('../../components/scan_failure_callout/scan_failure_callout', () => ({
  ScanFailureCallout: () => <div data-test-subj="alertZeroScanFailureCallout" />,
}));

const ALL_ONBOARDING_WORKER_IDS = [
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
];

// Event-driven workers carry no `scheduleInterval`, mirroring the real API.
const EVENT_DRIVEN_WORKER_IDS: string[] = [
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
];

const ALL_WORKERS_RESPONSE = {
  workers: ALL_ONBOARDING_WORKER_IDS.map((id) => ({
    id,
    enabled: true,
    settings: EVENT_DRIVEN_WORKER_IDS.includes(id) ? {} : { scheduleInterval: '4h' },
  })),
};

const renderPage = ({
  canWrite = false,
  httpPatch = jest.fn().mockResolvedValue({ worker: { id: 'mock', enabled: true } }),
  serverWorkers = ALL_WORKERS_RESPONSE,
}: {
  canWrite?: boolean;
  httpPatch?: jest.Mock;
  serverWorkers?: {
    workers: Array<{ id: string; enabled: boolean; settings?: { scheduleInterval?: string } }>;
  };
} = {}) => {
  const coreStart = coreMock.createStart();
  // coreMock.createStart() does not populate feature capabilities; set the
  // alertzero.write capability so the component can branch on it.
  (coreStart.application.capabilities as Record<string, unknown>).alertzero = { write: canWrite };
  // Mock http.get so useWorkers() always returns the configured server response
  // (including on background refetches), and http.patch so mutation calls are
  // interceptable per-test.
  const httpGet = jest.fn().mockResolvedValue(serverWorkers);
  const core = {
    ...coreStart,
    http: { ...coreStart.http, get: httpGet, patch: httpPatch },
  };
  const history = createMemoryHistory();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  // Pre-populate the workers list cache so the component renders synchronously
  // with the configured server response and useEnableWorkers can filter IDs on the first click.
  queryClient.setQueryData(queryKeys.workers.list(), serverWorkers);

  render(
    <I18nProvider>
      <EuiProvider>
        <QueryClientProvider client={queryClient}>
          <KibanaContextProvider services={core}>
            <Router history={history}>
              <OnboardingPage />
            </Router>
          </KibanaContextProvider>
        </QueryClientProvider>
      </EuiProvider>
    </I18nProvider>
  );

  return { history, application: core.application };
};

describe('OnboardingPage', () => {
  it('mounts the scan-failure callout', () => {
    renderPage();
    expect(screen.getByTestId('alertZeroScanFailureCallout')).toBeInTheDocument();
  });

  it('renders the title', () => {
    renderPage({ canWrite: true });
    expect(screen.getByText("Let's turn on the Watches?")).toBeInTheDocument();
  });

  describe('with write capability', () => {
    it('renders the subtitle', () => {
      renderPage({ canWrite: true });
      expect(screen.getByText(/A Watch is a small team of Workers/)).toBeInTheDocument();
    });

    it('renders worker toggle rows', () => {
      renderPage({ canWrite: true });
      expect(screen.getByText('Attack Discovery')).toBeInTheDocument();
      expect(screen.getByText('Alert Triage')).toBeInTheDocument();
    });

    it('renders a Read more link pointing at the placeholder docs URL', () => {
      renderPage({ canWrite: true });
      const link = screen.getByTestId('alertZeroOnboardingReadMoreLink');
      expect(link).toHaveTextContent('Read more about Watches in the documentation');
      expect(link).toHaveAttribute('href', ONBOARDING_READ_MORE_URL_PLACEHOLDER);
    });

    it('links to Watch settings from the intro', () => {
      const { history } = renderPage({ canWrite: true });
      fireEvent.click(screen.getByTestId('alertZeroOnboardingWatchSettingsLink'));
      expect(history.location.pathname).toBe('/watches');
    });

    it('recommends keeping all Watches enabled', () => {
      renderPage({ canWrite: true });
      expect(screen.getByText(/We recommend keeping all Watches enabled/)).toBeInTheDocument();
    });

    it('shows the watch and trigger badges for each worker', () => {
      renderPage({ canWrite: true });
      expect(
        screen.getByTestId(
          `alertZeroOnboardingWorkerWatch-${SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID}`
        )
      ).toHaveTextContent('Triage Watch');
      expect(
        screen.getByTestId(
          `alertZeroOnboardingWorkerTrigger-${SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID}`
        )
      ).toHaveTextContent('On new alerts');
      expect(
        screen.getByTestId(
          `alertZeroOnboardingWorkerTrigger-${SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID}`
        )
      ).toHaveTextContent('Every 4 hours');
    });

    it('shows how many workers are selected', () => {
      renderPage({ canWrite: true });
      expect(screen.getByTestId('alertZeroOnboardingSelectedCount')).toHaveTextContent(
        '6 of 6 Workers selected'
      );
      fireEvent.click(screen.getAllByRole('switch')[1]);
      expect(screen.getByTestId('alertZeroOnboardingSelectedCount')).toHaveTextContent(
        '5 of 6 Workers selected'
      );
    });

    it('does not call the API until Enable and run is clicked', () => {
      const httpPatch = jest.fn();
      renderPage({ canWrite: true, httpPatch });
      expect(httpPatch).not.toHaveBeenCalled();
    });

    it('shows the Attack Discovery workflows note', () => {
      renderPage({ canWrite: true });
      expect(screen.getByTestId('alertZeroOnboardingAttackDiscoveryNote')).toHaveTextContent(
        'Turning this on also enables the Attack Discovery workflows in Settings.'
      );
    });

    it('does not render the Before you enable panel', () => {
      renderPage({ canWrite: true });
      expect(screen.queryByText('Before you enable')).not.toBeInTheDocument();
    });

    it('calls the API for all workers and navigates to /watches when Enable and run is clicked', async () => {
      const httpPatch = jest.fn().mockResolvedValue({ worker: { id: 'mock', enabled: true } });
      const { history } = renderPage({ canWrite: true, httpPatch });

      fireEvent.click(screen.getByRole('button', { name: 'Enable and run' }));

      await waitFor(() => expect(history.location.pathname).toBe('/watches'));
      expect(httpPatch).toHaveBeenCalledTimes(6);
    });

    it('keeps controls disabled while save is in-flight and does not allow a second submission', async () => {
      // Use per-call resolvers so we control when each PATCH settles.
      const resolvers: Array<() => void> = [];
      const httpPatch = jest.fn().mockImplementation(
        () =>
          new Promise<{ worker: { id: string; enabled: boolean } }>((resolve) => {
            resolvers.push(() => resolve({ worker: { id: 'mock', enabled: true } }));
          })
      );
      renderPage({ canWrite: true, httpPatch });

      fireEvent.click(screen.getByRole('button', { name: 'Enable and run' }));

      // While all six PATCHes are pending, the button must be disabled.
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Enable and run' })).toHaveAttribute('disabled')
      );

      // The Watch settings link must not navigate away mid-save.
      expect(screen.getByTestId('alertZeroOnboardingWatchSettingsLink')).toBeDisabled();

      // A second click while in-flight must not trigger additional requests.
      fireEvent.click(screen.getByRole('button', { name: 'Enable and run' }));
      expect(httpPatch).toHaveBeenCalledTimes(6);

      // Resolve all pending PATCHes and verify the button re-enables.
      resolvers.forEach((r) => r());
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Enable and run' })).not.toHaveAttribute(
          'disabled'
        )
      );
    });

    it('does not navigate when a worker update fails', async () => {
      const httpPatch = jest.fn().mockRejectedValue(new Error('server error'));
      const { history } = renderPage({ canWrite: true, httpPatch });

      fireEvent.click(screen.getByRole('button', { name: 'Enable and run' }));

      // Wait for the entire save to settle (button stops loading) before asserting
      // that navigation did not occur — checking immediately after httpPatch fires
      // can race against the still-running allSettled fan-out.
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Enable and run' })).not.toHaveAttribute(
          'disabled'
        )
      );
      expect(history.location.pathname).toBe('/');
    });

    it('renders the Back button', () => {
      renderPage({ canWrite: true });
      expect(screen.getByTestId('alertZeroOnboardingBackButton')).toBeInTheDocument();
    });

    it('navigates to Security and does not send PATCHes when Back is clicked', () => {
      const httpPatch = jest.fn();
      const { application } = renderPage({ canWrite: true, httpPatch });

      fireEvent.click(screen.getByTestId('alertZeroOnboardingBackButton'));

      expect(application.navigateToApp).toHaveBeenCalledWith(SECURITY_APP_ID);
      expect(httpPatch).not.toHaveBeenCalled();
    });

    it('disables the Back button while save is in-flight so the user cannot navigate away mid-PATCH', async () => {
      const resolvers: Array<() => void> = [];
      const httpPatch = jest.fn().mockImplementation(
        () =>
          new Promise<{ worker: { id: string; enabled: boolean } }>((resolve) => {
            resolvers.push(() => resolve({ worker: { id: 'mock', enabled: true } }));
          })
      );
      const { application } = renderPage({ canWrite: true, httpPatch });

      fireEvent.click(screen.getByRole('button', { name: 'Enable and run' }));

      // While PATCHes are pending the Back button must be disabled.
      await waitFor(() =>
        expect(screen.getByTestId('alertZeroOnboardingBackButton')).toHaveAttribute('disabled')
      );
      fireEvent.click(screen.getByTestId('alertZeroOnboardingBackButton'));
      expect(application.navigateToApp).not.toHaveBeenCalled();

      // After all PATCHes settle the button re-enables.
      resolvers.forEach((r) => r());
      await waitFor(() =>
        expect(screen.getByTestId('alertZeroOnboardingBackButton')).not.toHaveAttribute('disabled')
      );
    });

    it('disables a toggle when it is the last enabled worker', () => {
      renderPage({ canWrite: true });

      // Disable all but the first toggle by clicking them.
      const toggles = screen.getAllByRole('switch');
      for (let i = 1; i < toggles.length; i++) {
        fireEvent.click(toggles[i]);
      }

      // The first (and now only enabled) toggle should be disabled.
      expect(toggles[0]).toBeDisabled();
    });

    it('sends enabled: false for a worker that was toggled off', async () => {
      const httpPatch = jest.fn().mockResolvedValue({ worker: { id: 'mock', enabled: false } });
      renderPage({ canWrite: true, httpPatch });

      // Catalog order: Alert Triage (0), Attack Discovery (1), ...
      // Toggle Attack Discovery (index 1) off.
      const toggles = screen.getAllByRole('switch');
      fireEvent.click(toggles[1]);

      fireEvent.click(screen.getByRole('button', { name: 'Enable and run' }));

      await waitFor(() =>
        expect(httpPatch).toHaveBeenCalledWith(
          expect.stringContaining(SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID),
          expect.objectContaining({ body: JSON.stringify({ enabled: false }) })
        )
      );
      expect(httpPatch).toHaveBeenCalledWith(
        expect.stringContaining(SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID),
        expect.objectContaining({ body: JSON.stringify({ enabled: true }) })
      );
    });
  });

  describe('skill-gated workers (partial server response)', () => {
    it('omits a worker that is absent from the server response', () => {
      // Server only knows about 5 of the 6 onboarding workers — the hunt worker is gated.
      const serverWorkers = {
        workers: ALL_ONBOARDING_WORKER_IDS.filter(
          (id) => id !== SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID
        ).map((id) => ({ id, enabled: true })),
      };
      renderPage({ canWrite: true, serverWorkers });

      // The absent worker must not appear.
      expect(
        screen.queryByTestId(
          `alertZeroOnboardingWorkerToggle-${SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID}`
        )
      ).not.toBeInTheDocument();
      // The four present workers must still render.
      expect(
        screen.getByTestId(
          `alertZeroOnboardingWorkerToggle-${SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID}`
        )
      ).toBeInTheDocument();
    });

    it('does not PATCH the absent worker when Enable and run is clicked', async () => {
      const serverWorkers = {
        workers: ALL_ONBOARDING_WORKER_IDS.filter(
          (id) => id !== SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID
        ).map((id) => ({ id, enabled: true })),
      };
      const httpPatch = jest.fn().mockResolvedValue({ worker: { id: 'mock', enabled: true } });
      const { history } = renderPage({ canWrite: true, httpPatch, serverWorkers });

      fireEvent.click(screen.getByRole('button', { name: 'Enable and run' }));

      await waitFor(() => expect(history.location.pathname).toBe('/watches'));
      // Only the 5 present workers should be PATCHed — not the skill-gated absent one.
      expect(httpPatch).toHaveBeenCalledTimes(5);
      expect(httpPatch).not.toHaveBeenCalledWith(
        expect.stringContaining(SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID),
        expect.anything()
      );
    });

    it('shows an empty state and disables the Enable button when no workers are available from the server', () => {
      // Server returns no onboarding workers at all — everything is skill-gated.
      renderPage({ canWrite: true, serverWorkers: { workers: [] } });

      expect(screen.getByTestId('alertZeroOnboardingNoWorkersAvailable')).toBeInTheDocument();
      expect(screen.queryByRole('switch')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Enable and run' })).toBeDisabled();
    });

    it('does not count the absent worker toward the last-enabled guard', () => {
      // Three workers known to server; toggling two of them off should disable the last, not crash.
      const presentIds = ALL_ONBOARDING_WORKER_IDS.slice(0, 3);
      const serverWorkers = { workers: presentIds.map((id) => ({ id, enabled: true })) };
      renderPage({ canWrite: true, serverWorkers });

      // Toggle two of the three present workers off.
      const toggles = screen.getAllByRole('switch');
      fireEvent.click(toggles[1]);
      fireEvent.click(toggles[2]);

      // Only 3 toggles should exist and the first (last enabled) should be disabled.
      expect(toggles).toHaveLength(3);
      expect(toggles[0]).toBeDisabled();
    });

    it('disables the Enable button when the sole checked worker disappears from a workers refetch', async () => {
      // Start with two workers: user unchecks the second, leaving only the first (last-enabled guard
      // keeps its toggle disabled). Then a background refetch removes the first worker entirely —
      // enabledCount should drop to 0 and the Enable button must be disabled.
      const twoWorkers = {
        workers: [
          { id: ALL_ONBOARDING_WORKER_IDS[0], enabled: false },
          { id: ALL_ONBOARDING_WORKER_IDS[1], enabled: false },
        ],
      };
      const coreStart = coreMock.createStart();
      (coreStart.application.capabilities as Record<string, unknown>).alertzero = { write: true };
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });
      queryClient.setQueryData(queryKeys.workers.list(), twoWorkers);
      const httpGet = jest.fn().mockResolvedValue(twoWorkers);
      const core = { ...coreStart, http: { ...coreStart.http, get: httpGet } };

      const history = createMemoryHistory();
      const makeUI = () => (
        <I18nProvider>
          <EuiProvider>
            <QueryClientProvider client={queryClient}>
              <KibanaContextProvider services={core}>
                <Router history={history}>
                  <OnboardingPage />
                </Router>
              </KibanaContextProvider>
            </QueryClientProvider>
          </EuiProvider>
        </I18nProvider>
      );

      const { rerender } = render(makeUI());

      // Catalog order: Alert Triage (B=ALL_ONBOARDING_WORKER_IDS[1]) is toggles[0],
      // Attack Discovery (A=ALL_ONBOARDING_WORKER_IDS[0]) is toggles[1].
      // Toggle Alert Triage (B) off — Attack Discovery (A) becomes the sole enabled worker.
      const toggles = screen.getAllByRole('switch');
      fireEvent.click(toggles[0]);
      expect(screen.getByRole('button', { name: 'Enable and run' })).not.toBeDisabled();

      // Simulate a background workers refetch that removes the sole checked worker (Attack Discovery).
      // Update the http mock so the next fetch returns only Alert Triage (B), then force a refetch.
      const oneWorker = {
        workers: [{ id: ALL_ONBOARDING_WORKER_IDS[1], enabled: false }], // only B = Alert Triage
      };
      httpGet.mockResolvedValue(oneWorker);
      await act(async () => {
        await queryClient.refetchQueries({ queryKey: queryKeys.workers.list() });
      });
      rerender(makeUI());

      // enabledCount is now 0: only Alert Triage (B) remains and the user had checked it off.
      // The Enable button must be disabled so no empty PATCH fan-out can be submitted.
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Enable and run' })).toBeDisabled()
      );
    });
  });

  describe('without write capability (read-only user)', () => {
    it('renders the read-only body copy', () => {
      renderPage({ canWrite: false });
      expect(screen.getByText(/Ask an administrator to enable a Watch worker/)).toBeInTheDocument();
    });

    it('does not render the worker toggle list', () => {
      renderPage({ canWrite: false });
      expect(screen.queryByTestId(/alertZeroOnboardingWorkerToggle/)).not.toBeInTheDocument();
    });
  });
});
