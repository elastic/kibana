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
import { SECURITY_APP_ID } from '@kbn/deeplinks-security';
import { queryKeys } from '../../query_keys';
import { OnboardingPage } from './onboarding_page';

const ALL_ONBOARDING_WORKER_IDS = [
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
];

const ALL_WORKERS_RESPONSE = {
  workers: ALL_ONBOARDING_WORKER_IDS.map((id) => ({ id, enabled: true })),
};

const renderPage = ({
  canWrite = false,
  httpPatch = jest.fn().mockResolvedValue({ worker: { id: 'mock', enabled: true } }),
  serverWorkers = ALL_WORKERS_RESPONSE,
}: {
  canWrite?: boolean;
  httpPatch?: jest.Mock;
  serverWorkers?: { workers: Array<{ id: string; enabled: boolean }> };
} = {}) => {
  const coreStart = coreMock.createStart();
  // coreMock.createStart() does not populate feature capabilities; set the
  // alertzero.write capability so the component can branch on it.
  (coreStart.application.capabilities as Record<string, unknown>).alertzero = { write: canWrite };
  // Mock http.get so useWorkers() always returns the configured server response
  // (including on background refetches), and http.patch so mutation calls are
  // interceptable per-test.
  const httpGet = jest.fn().mockResolvedValue(serverWorkers);
  const core = { ...coreStart, http: { ...coreStart.http, get: httpGet, patch: httpPatch } };
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
  it('renders the title', () => {
    renderPage({ canWrite: true });
    expect(screen.getByText('Enable your workers')).toBeInTheDocument();
  });

  describe('with write capability', () => {
    it('renders the subtitle', () => {
      renderPage({ canWrite: true });
      expect(screen.getByText(/Choose the workers you need/)).toBeInTheDocument();
    });

    it('renders worker toggle rows', () => {
      renderPage({ canWrite: true });
      expect(screen.getByText('Attack Discovery')).toBeInTheDocument();
      expect(screen.getByText('Alert Triage')).toBeInTheDocument();
    });

    it('renders the Before you enable callout', () => {
      renderPage({ canWrite: true });
      expect(screen.getByText('Before you enable')).toBeInTheDocument();
    });

    it('calls the API for all workers and navigates to /watches when Enable and continue is clicked', async () => {
      const httpPatch = jest.fn().mockResolvedValue({ worker: { id: 'mock', enabled: true } });
      const { history } = renderPage({ canWrite: true, httpPatch });

      fireEvent.click(screen.getByRole('button', { name: 'Enable and continue' }));

      await waitFor(() => expect(history.location.pathname).toBe('/watches'));
      expect(httpPatch).toHaveBeenCalledTimes(5);
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

      fireEvent.click(screen.getByRole('button', { name: 'Enable and continue' }));

      // While all five PATCHes are pending, the button must be disabled.
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Enable and continue' })).toHaveAttribute(
          'disabled'
        )
      );

      // A second click while in-flight must not trigger additional requests.
      fireEvent.click(screen.getByRole('button', { name: 'Enable and continue' }));
      expect(httpPatch).toHaveBeenCalledTimes(5);

      // Resolve all pending PATCHes and verify the button re-enables.
      resolvers.forEach((r) => r());
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Enable and continue' })).not.toHaveAttribute(
          'disabled'
        )
      );
    });

    it('does not navigate when a worker update fails', async () => {
      const httpPatch = jest.fn().mockRejectedValue(new Error('server error'));
      const { history } = renderPage({ canWrite: true, httpPatch });

      fireEvent.click(screen.getByRole('button', { name: 'Enable and continue' }));

      // Wait for the entire save to settle (button stops loading) before asserting
      // that navigation did not occur — checking immediately after httpPatch fires
      // can race against the still-running allSettled fan-out.
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Enable and continue' })).not.toHaveAttribute(
          'disabled'
        )
      );
      expect(history.location.pathname).toBe('/');
    });

    it('renders the Not now link', () => {
      renderPage({ canWrite: true });
      expect(screen.getByText(/Not now/)).toBeInTheDocument();
    });

    it('navigates to Security and does not send PATCHes when Not now is clicked', () => {
      const httpPatch = jest.fn();
      const { application } = renderPage({ canWrite: true, httpPatch });

      fireEvent.click(screen.getByTestId('alertZeroOnboardingNotNowLink'));

      expect(application.navigateToApp).toHaveBeenCalledWith(SECURITY_APP_ID);
      expect(httpPatch).not.toHaveBeenCalled();
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

      // Toggle the second worker off.
      const toggles = screen.getAllByRole('switch');
      fireEvent.click(toggles[1]);

      fireEvent.click(screen.getByRole('button', { name: 'Enable and continue' }));

      await waitFor(() =>
        expect(httpPatch).toHaveBeenCalledWith(
          expect.stringContaining(SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID),
          expect.objectContaining({ body: JSON.stringify({ enabled: false }) })
        )
      );
      expect(httpPatch).toHaveBeenCalledWith(
        expect.stringContaining(SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID),
        expect.objectContaining({ body: JSON.stringify({ enabled: true }) })
      );
    });
  });

  describe('skill-gated workers (partial server response)', () => {
    it('omits a worker that is absent from the server response', () => {
      // Server only knows about 4 of the 5 onboarding workers — the hunt worker is gated.
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

    it('does not PATCH the absent worker when Enable and continue is clicked', async () => {
      const serverWorkers = {
        workers: ALL_ONBOARDING_WORKER_IDS.filter(
          (id) => id !== SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID
        ).map((id) => ({ id, enabled: true })),
      };
      const httpPatch = jest.fn().mockResolvedValue({ worker: { id: 'mock', enabled: true } });
      const { history } = renderPage({ canWrite: true, httpPatch, serverWorkers });

      fireEvent.click(screen.getByRole('button', { name: 'Enable and continue' }));

      await waitFor(() => expect(history.location.pathname).toBe('/watches'));
      // Only the 4 present workers should be PATCHed — not the skill-gated absent one.
      expect(httpPatch).toHaveBeenCalledTimes(4);
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
      expect(screen.getByRole('button', { name: 'Enable and continue' })).toBeDisabled();
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
