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
import { SECURITY_APP_ID, SecurityPageName } from '@kbn/deeplinks-security';
import { queryKeys } from '../../query_keys';
import { ONBOARDING_READ_MORE_URL_PLACEHOLDER } from './constants';
import { OnboardingPage } from './onboarding_page';

jest.mock('../../components/scan_failure_callout/scan_failure_callout', () => ({
  ScanFailureCallout: () => <div data-test-subj="alertZeroScanFailureCallout" />,
}));

jest.mock('../../components/worker_dependencies/worker_dependencies_callout', () => ({
  WorkerDependenciesCallout: ({ worker, surface }: { worker: { id: string }; surface: string }) => (
    <div data-test-subj={`alertZeroWorkerDependencies-${surface}-${worker.id}`} />
  ),
}));

const mockEnsureWorkerServiceAccounts = jest.fn();
jest.mock('../../service_accounts/ensure_worker_service_accounts', () => ({
  ensureWorkerServiceAccounts: (...args: unknown[]) => mockEnsureWorkerServiceAccounts(...args),
}));

beforeEach(() => {
  mockEnsureWorkerServiceAccounts.mockReset();
  mockEnsureWorkerServiceAccounts.mockImplementation(
    async (_http: unknown, _serviceAccounts: unknown, workerIds: string[]) =>
      new Map(workerIds.map((id) => [id, { ok: true, serviceAccountId: 'account-a' }]))
  );
});

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

const enabledWorkerBody = JSON.stringify({
  enabled: true,
  settings: { serviceAccountId: 'account-a' },
  settingsRevision: null,
});

const renderPage = ({
  canWrite = false,
  httpPatch = jest.fn().mockResolvedValue({ worker: { id: 'mock', enabled: true } }),
  httpGet,
  serverWorkers = ALL_WORKERS_RESPONSE,
  skipIntro = true,
}: {
  skipIntro?: boolean;
  canWrite?: boolean;
  httpPatch?: jest.Mock;
  httpGet?: jest.Mock;
  serverWorkers?: {
    workers: Array<{
      id: string;
      enabled: boolean;
      settingsRevision?: number | null;
      settings?: { scheduleInterval?: string; serviceAccountId?: string };
    }>;
    canModifyWorkers?: boolean;
  };
} = {}) => {
  const coreStart = coreMock.createStart();
  // coreMock.createStart() does not populate feature capabilities; set the
  // alertzero.write capability so the component can branch on it.
  (coreStart.application.capabilities as Record<string, unknown>).alertzero = { write: canWrite };
  // Mock http.get so useWorkers() always returns the configured server response
  // (including on background refetches), and http.patch so mutation calls are
  // interceptable per-test.
  const resolvedHttpGet = httpGet ?? jest.fn().mockResolvedValue(serverWorkers);
  const core = {
    ...coreStart,
    http: { ...coreStart.http, get: resolvedHttpGet, patch: httpPatch },
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

  if (skipIntro) {
    fireEvent.click(screen.getByTestId('alertZeroOnboardingContinueButton'));
  }

  return { history, application: core.application, toasts: core.notifications.toasts };
};

describe('OnboardingPage', () => {
  describe('intro step', () => {
    it('renders the promo, the UI preview and the Continue button instead of worker toggles', () => {
      renderPage({ canWrite: true, skipIntro: false });

      expect(screen.getByTestId('alertZeroOnboardingIntroPromo')).toBeInTheDocument();
      expect(screen.getByTestId('alertZeroOnboardingUiPreview')).toBeInTheDocument();
      expect(screen.getByTestId('alertZeroOnboardingContinueButton')).toBeInTheDocument();
      expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    });

    it('is shown to read-only users and does not send PATCHes', () => {
      const httpPatch = jest.fn();
      renderPage({ canWrite: false, skipIntro: false, httpPatch });

      expect(screen.getByTestId('alertZeroOnboardingContinueButton')).toBeInTheDocument();
      expect(httpPatch).not.toHaveBeenCalled();
    });

    it('shows a disabled video placeholder', () => {
      renderPage({ canWrite: true, skipIntro: false });

      expect(screen.getByTestId('alertZeroOnboardingVideoPlaceholder')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /video placeholder/ })).toBeDisabled();
    });

    it('switches the preview section when a dot is selected', () => {
      renderPage({ canWrite: true, skipIntro: false });

      fireEvent.click(screen.getByTestId('alertZeroOnboardingPreviewDot-investigate'));

      expect(
        screen.getByText('Run investigations end to end and close what I can')
      ).toBeInTheDocument();
      expect(screen.getByText('Named-pipe backdoor — eng-ws-19')).toBeInTheDocument();
    });

    it('moves between preview sections with the arrow keys', () => {
      renderPage({ canWrite: true, skipIntro: false });

      const firstTab = screen.getAllByRole('tab')[0];
      fireEvent.keyDown(firstTab, { key: 'ArrowRight' });

      const [, secondTab] = screen.getAllByRole('tab');
      expect(secondTab).toHaveAttribute('aria-selected', 'true');
      expect(secondTab).toHaveFocus();
    });

    it('links Read more to the placeholder destination', () => {
      renderPage({ canWrite: true, skipIntro: false });

      expect(screen.getByTestId('alertZeroOnboardingReadMoreLink')).toHaveAttribute(
        'href',
        ONBOARDING_READ_MORE_URL_PLACEHOLDER
      );
    });

    it('navigates to the Security Get Started page from the set up data link', () => {
      const { application } = renderPage({ canWrite: true, skipIntro: false });

      fireEvent.click(screen.getByTestId('alertZeroOnboardingSetUpDataLink'));

      expect(application.navigateToApp).toHaveBeenCalledWith(SECURITY_APP_ID, {
        deepLinkId: SecurityPageName.landing,
      });
    });

    it('moves to worker selection when Continue is clicked', () => {
      renderPage({ canWrite: true, skipIntro: false });

      fireEvent.click(screen.getByTestId('alertZeroOnboardingContinueButton'));

      expect(screen.getByText("Let's turn on the Watches?")).toBeInTheDocument();
      expect(screen.getAllByRole('switch').length).toBeGreaterThan(0);
    });
  });

  it('mounts the scan-failure callout', () => {
    renderPage();
    expect(screen.getByTestId('alertZeroScanFailureCallout')).toBeInTheDocument();
  });

  it('disables worker toggles and Enable and run without manage_security', () => {
    renderPage({
      canWrite: true,
      serverWorkers: { ...ALL_WORKERS_RESPONSE, canModifyWorkers: false },
    });

    expect(screen.getByTestId('alertZeroOnboardingModifyForbidden')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enable and run' })).toBeDisabled();
    expect(
      screen.getByTestId(
        `alertZeroOnboardingWorkerToggle-${SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID}`
      )
    ).toBeDisabled();
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

    it('sets up a service account for each worker it turns on and binds it', async () => {
      const httpPatch = jest.fn().mockResolvedValue({ worker: { id: 'mock', enabled: true } });
      const { history } = renderPage({ canWrite: true, httpPatch });

      fireEvent.click(screen.getByRole('button', { name: 'Enable and run' }));

      await waitFor(() => expect(history.location.pathname).toBe('/watches'));
      expect(mockEnsureWorkerServiceAccounts).toHaveBeenCalledTimes(1);
      expect([...mockEnsureWorkerServiceAccounts.mock.calls[0][2]].sort()).toEqual(
        [...ALL_ONBOARDING_WORKER_IDS].sort()
      );
      expect(httpPatch).toHaveBeenCalledWith(
        expect.stringContaining(SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID),
        expect.objectContaining({ body: enabledWorkerBody })
      );
    });

    it('keeps the service account a worker already has', async () => {
      const httpPatch = jest.fn().mockResolvedValue({ worker: { id: 'mock', enabled: true } });
      const serverWorkers = {
        workers: ALL_WORKERS_RESPONSE.workers.map((worker) =>
          worker.id === SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID
            ? { ...worker, enabled: false, settings: { serviceAccountId: 'kibana/existing' } }
            : worker
        ),
      };
      renderPage({ canWrite: true, httpPatch, serverWorkers });

      fireEvent.click(screen.getByRole('button', { name: 'Enable and run' }));

      await waitFor(() =>
        expect(httpPatch).toHaveBeenCalledWith(
          expect.stringContaining(SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID),
          expect.objectContaining({ body: JSON.stringify({ enabled: true }) })
        )
      );
      expect(mockEnsureWorkerServiceAccounts.mock.calls[0][2]).not.toContain(
        SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID
      );
    });

    it('turns on the workers that got an account, names the ones that did not and retries them', async () => {
      mockEnsureWorkerServiceAccounts.mockImplementation(
        async (_http: unknown, _serviceAccounts: unknown, workerIds: string[]) =>
          new Map(
            workerIds.map((id) => [
              id,
              id === SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID
                ? { ok: false, error: 'Forbidden' }
                : { ok: true, serviceAccountId: 'account-a' },
            ])
          )
      );
      const httpPatch = jest.fn().mockResolvedValue({ worker: { id: 'mock', enabled: true } });
      const { history, toasts } = renderPage({ canWrite: true, httpPatch });

      fireEvent.click(screen.getByRole('button', { name: 'Enable and run' }));

      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Enable and run' })).not.toBeDisabled()
      );
      expect(httpPatch).toHaveBeenCalledTimes(ALL_ONBOARDING_WORKER_IDS.length - 1);
      expect(httpPatch).not.toHaveBeenCalledWith(
        expect.stringContaining(SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID),
        expect.anything()
      );
      expect(toasts.addDanger).toHaveBeenCalledTimes(1);
      expect(toasts.addDanger).toHaveBeenCalledWith(
        expect.objectContaining({ text: expect.stringContaining('Alert Triage: Forbidden') })
      );
      expect(history.location.pathname).not.toBe('/watches');

      fireEvent.click(screen.getByRole('button', { name: 'Enable and run' }));

      await waitFor(() => expect(mockEnsureWorkerServiceAccounts).toHaveBeenCalledTimes(2));
      expect(mockEnsureWorkerServiceAccounts.mock.calls[1][2]).toContain(
        SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID
      );
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

    it('shows the Attack Discovery dependency callout', () => {
      renderPage({ canWrite: true });
      expect(
        screen.getByTestId(
          `alertZeroWorkerDependencies-onboarding-${SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID}`
        )
      ).toBeInTheDocument();
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

    it('sends the saved revision when Enable and run is retried after a partial save', async () => {
      const triageId = SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID;
      let savedRevision: number | null = null;
      const list = () => ({
        workers: ALL_ONBOARDING_WORKER_IDS.map((id) => ({
          id,
          enabled: id !== triageId && savedRevision != null,
          settingsRevision: id === triageId ? null : savedRevision,
        })),
      });
      const httpGet = jest.fn(async () => list());
      const httpPatch = jest.fn(async (url: string, _options?: { body?: string }) => {
        if (url.includes(triageId)) {
          throw new Error('blocked');
        }
        savedRevision = 2;
        return { worker: { id: 'mock', enabled: true } };
      });
      renderPage({ canWrite: true, httpPatch, httpGet, serverWorkers: list() });

      const attackDiscoveryCalls = () =>
        httpPatch.mock.calls.filter(([url]) =>
          String(url).includes(SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID)
        );

      fireEvent.click(screen.getByRole('button', { name: 'Enable and run' }));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Enable and run' })).not.toBeDisabled()
      );

      fireEvent.click(screen.getByRole('button', { name: 'Enable and run' }));
      await waitFor(() => expect(attackDiscoveryCalls()).toHaveLength(2));
      const retry = attackDiscoveryCalls()[1];
      if (!retry?.[1]?.body) {
        throw new Error('expected the Attack Discovery retry');
      }
      expect(JSON.parse(retry[1].body).settingsRevision).toBe(2);
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
        expect.objectContaining({ body: enabledWorkerBody })
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
      const core = {
        ...coreStart,
        http: { ...coreStart.http, get: httpGet },
      };

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
      fireEvent.click(screen.getByTestId('alertZeroOnboardingContinueButton'));

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
