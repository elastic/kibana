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
import { queryKeys } from '../../query_keys';
import { OnboardingPage } from './onboarding_page';

const ALL_ONBOARDING_WORKER_IDS = [
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
];

const renderPage = ({
  canWrite = false,
  httpPatch = jest.fn().mockResolvedValue({}),
  seedWorkers = false,
}: {
  canWrite?: boolean;
  httpPatch?: jest.Mock;
  seedWorkers?: boolean;
} = {}) => {
  const coreStart = coreMock.createStart();
  // coreMock.createStart() does not populate feature capabilities; set the
  // alertzero.write capability so the component can branch on it.
  (coreStart.application.capabilities as Record<string, unknown>).alertzero = { write: canWrite };
  const core = { ...coreStart, http: { ...coreStart.http, patch: httpPatch } };
  const history = createMemoryHistory();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  if (seedWorkers) {
    // Pre-populate the workers list cache so useEnableWorkers can filter IDs
    // against the server's known workers and avoid spurious 404s.
    queryClient.setQueryData(queryKeys.workers.list(), {
      workers: ALL_ONBOARDING_WORKER_IDS.map((id) => ({ id })),
    });
  }

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

  return { history };
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
      const { history } = renderPage({ canWrite: true, httpPatch, seedWorkers: true });

      fireEvent.click(screen.getByRole('button', { name: 'Enable and continue' }));

      await waitFor(() => expect(history.location.pathname).toBe('/watches'));
      expect(httpPatch).toHaveBeenCalledTimes(5);
    });

    it('does not navigate when a worker update fails', async () => {
      const httpPatch = jest.fn().mockRejectedValue(new Error('server error'));
      const { history } = renderPage({ canWrite: true, httpPatch, seedWorkers: true });

      fireEvent.click(screen.getByRole('button', { name: 'Enable and continue' }));

      await waitFor(() => expect(httpPatch).toHaveBeenCalled());
      expect(history.location.pathname).toBe('/');
    });

    it('renders the Not now link', () => {
      renderPage({ canWrite: true });
      expect(screen.getByText(/Not now/)).toBeInTheDocument();
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
      renderPage({ canWrite: true, httpPatch, seedWorkers: true });

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
