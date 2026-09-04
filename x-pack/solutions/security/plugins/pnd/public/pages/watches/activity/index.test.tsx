/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
  PND_RUNS_URL,
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
} from '@kbn/pnd-common';
import type { ListRunsResponse, PndRun } from '@kbn/pnd-common';

import { PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER } from '../../../../common/constants';
import { renderWithPndProviders } from '../../../components/test_utils/render_with_pnd_providers';
import { WORKFLOWS_APP_ID } from '../../../hooks/use_workflows_deep_link';
import { createHttpFetchError } from '../../../test_helpers/create_http_fetch_error';
import { createHttpResponse } from '../../../test_helpers/create_http_response';
import {
  createPndTestServices,
  type PndTestServices,
} from '../../../test_helpers/render_with_providers';
import { WatchesActivityPage } from '.';

/**
 * Retries are switched off here so a failed read reaches its state on the first
 * render rather than after three exponential-backoff attempts — a hook's own
 * `retry` beats the test client's `retry: false`. The predicate itself is
 * unit-tested in `hooks/retry_on_transient_error`; this suite is about which
 * state the ledger shows.
 */
/**
 * `WatchesSectionLayout` renders `AppHeader`, which reads the Chrome service directly — and that
 * context only exists under `coreStart.rendering.addContext`, which no unit test mounts. Stubbing
 * the header is the repo's convention for a page test that is not about the header itself (see
 * `cloud_security_posture/public/pages/rules/rules.test.tsx`); `@kbn/core-chrome-browser-context` is
 * `platform/private`, so a security plugin cannot provide the real context here.
 */
jest.mock('@kbn/app-header', () => ({
  __esModule: true,
  AppHeader: () => null,
}));

jest.mock('../../../hooks/retry_on_transient_error', () => ({
  MAX_RETRY_ATTEMPTS: 3,
  retryOnTransientError: () => false,
}));

const STEP_LEVEL_PATH =
  '/system-security-watch-deep?tab=executions&executionId=run-1&stepExecutionId=step-exec-1';
const EXECUTION_LEVEL_PATH =
  '/system-security-watch-post-incident?tab=executions&executionId=run-2';
const WORKFLOWS_URL = `/s/agent-3/app/workflows${STEP_LEVEL_PATH}`;

const parkedRun: PndRun = {
  correlationId: 'alert-1',
  deepLinkPath: STEP_LEVEL_PATH,
  executionId: 'run-1',
  pendingGateCount: 1,
  startedAt: '2026-08-03T12:00:00.000Z',
  status: 'waiting_for_input',
  summary: 'Credential dumping on host-1',
  watchId: SYSTEM_SECURITY_WATCH_DEEP_ID,
  workflowId: SYSTEM_SECURITY_WATCH_DEEP_ID,
  workflowRunId: 'run-1',
};

const failedRun: PndRun = {
  correlationId: '',
  deepLinkPath: EXECUTION_LEVEL_PATH,
  executionId: 'run-2',
  pendingGateCount: 0,
  reason: 'derive_ids timed out',
  startedAt: '2026-08-03T11:00:00.000Z',
  status: 'failed',
  summary: 'Detection watch run',
  watchId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
  workflowId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
  workflowRunId: 'run-2',
};

const bothRuns: ListRunsResponse = { runs: [parkedRun, failedRun], total: 2 };

const renderActivity = ({
  body,
  error,
  headers,
  route = '/watches/activity',
  services = createPndTestServices(),
  workflowsUrl = WORKFLOWS_URL,
}: {
  body?: ListRunsResponse;
  error?: unknown;
  headers?: Record<string, string>;
  route?: string;
  services?: PndTestServices;
  workflowsUrl?: string | null;
} = {}) => {
  if (error != null) {
    services.http.get.mockRejectedValue(error);
  } else {
    services.http.get.mockResolvedValue(createHttpResponse({ body, headers }));
  }

  if (workflowsUrl == null) {
    // a Kibana without `workflowsManagement`: `getUrlForApp` throws
    services.application.getUrlForApp.mockImplementation(() => {
      throw new Error('Workflows app is not registered');
    });
  } else {
    services.application.getUrlForApp.mockReturnValue(workflowsUrl);
  }

  return {
    // spread, because the shared wrapper takes `Record<string, unknown>` and an
    // interface has no implicit index signature
    ...renderWithPndProviders(<WatchesActivityPage />, { route, services: { ...services } }),
    services,
  };
};

describe('WatchesActivityPage', () => {
  it('keeps the Watches subnav, so the section highlight still works', async () => {
    renderActivity({ body: bothRuns });

    expect(await screen.findByTestId('pndWatchesSubnav')).toBeInTheDocument();
  });

  it('lists the runs of both watches', async () => {
    renderActivity({ body: bothRuns });

    expect(await screen.findAllByTestId('pndRunSummary')).toHaveLength(2);
  });

  it('names the watch each run belongs to', async () => {
    renderActivity({ body: bothRuns });

    expect((await screen.findAllByTestId('pndRunWatch'))[0]).toHaveTextContent('Forensic Watch');
  });

  it('badges the run status', async () => {
    renderActivity({ body: bothRuns });

    expect((await screen.findAllByTestId('pndRunStatusBadge'))[0]).toHaveAttribute(
      'data-status',
      'waiting_for_input'
    );
  });

  it('says how many approvals a parked run is waiting on', async () => {
    renderActivity({ body: bothRuns });

    expect(await screen.findByTestId('pndRunPendingGateCount')).toHaveTextContent('1 approval');
  });

  it('shows a terminal run’s reason, which is the reason to read the ledger', async () => {
    renderActivity({ body: bothRuns });

    expect(await screen.findByTestId('pndRunReason')).toHaveTextContent('derive_ids timed out');
  });

  it('links a parked run to the Workflows app through getUrlForApp, never a hand-built path', async () => {
    const { services } = renderActivity({ body: bothRuns });

    await screen.findAllByTestId('pndRunOpenExecution');

    expect(services.application.getUrlForApp).toHaveBeenCalledWith(WORKFLOWS_APP_ID, {
      path: STEP_LEVEL_PATH,
    });
  });

  it('renders the resolved url as the href', async () => {
    renderActivity({ body: bothRuns });

    expect((await screen.findAllByTestId('pndRunOpenExecution'))[0]).toHaveAttribute(
      'href',
      WORKFLOWS_URL
    );
  });

  it('says the link lands on a step when the run is parked at exactly one gate', async () => {
    renderActivity({ body: bothRuns });

    expect((await screen.findAllByTestId('pndRunOpenExecution'))[0]).toHaveAttribute(
      'data-step-level',
      'true'
    );
  });

  it('says the link lands on the run when there is no single pending gate', async () => {
    renderActivity({ body: bothRuns });

    expect((await screen.findAllByTestId('pndRunOpenExecution'))[1]).toHaveAttribute(
      'data-step-level',
      'false'
    );
  });

  it('opens the execution in a new tab, so the ledger stays where it was', async () => {
    const { services } = renderActivity({ body: bothRuns });

    fireEvent.click((await screen.findAllByTestId('pndRunOpenExecution'))[0]);

    expect(services.application.navigateToApp).toHaveBeenCalledWith(WORKFLOWS_APP_ID, {
      openInNewTab: true,
      path: STEP_LEVEL_PATH,
    });
  });

  it('degrades to a plain label on a Kibana without the Workflows app, rather than crashing the page', async () => {
    renderActivity({ body: bothRuns, workflowsUrl: null });

    expect(await screen.findAllByTestId('pndRunOpenExecutionUnavailable')).toHaveLength(2);
  });

  it('opens the four-phase lifecycle as an overlay over the ledger', async () => {
    const { history } = renderActivity({ body: bothRuns });

    fireEvent.click(await screen.findByTestId('pndRunViewLifecycle'));

    expect(history.location.search).toBe('?lifecycle=alert-1');
  });

  it('stays on the ledger when the lifecycle opens', async () => {
    const { history } = renderActivity({ body: bothRuns });

    fireEvent.click(await screen.findByTestId('pndRunViewLifecycle'));

    expect(history.location.pathname).toBe('/watches/activity');
  });

  it('says so rather than offering a lifecycle for a run with no correlated discovery', async () => {
    renderActivity({ body: bothRuns });

    expect(await screen.findByTestId('pndRunUncorrelated')).toBeInTheDocument();
  });

  it('filters server-side when the url names a watch', async () => {
    const { services } = renderActivity({
      body: { runs: [parkedRun], total: 1 },
      route: `/watches/activity?watchId=${SYSTEM_SECURITY_WATCH_DEEP_ID}`,
    });

    await waitFor(() =>
      expect(services.http.get).toHaveBeenCalledWith(
        PND_RUNS_URL,
        expect.objectContaining({ query: { watchId: SYSTEM_SECURITY_WATCH_DEEP_ID } })
      )
    );
  });

  it('says which watch the ledger is filtered to', async () => {
    renderActivity({
      body: { runs: [parkedRun], total: 1 },
      route: `/watches/activity?watchId=${SYSTEM_SECURITY_WATCH_DEEP_ID}`,
    });

    expect(await screen.findByTestId('pndRunsWatchFilter')).toHaveTextContent('Forensic Watch');
  });

  it('clears the watch filter back to every watch', async () => {
    const { history } = renderActivity({
      body: { runs: [parkedRun], total: 1 },
      route: `/watches/activity?watchId=${SYSTEM_SECURITY_WATCH_DEEP_ID}`,
    });

    fireEvent.click(await screen.findByTestId('pndRunsClearWatchFilter'));

    expect(history.location.search).toBe('');
  });

  it('ignores a watch id that is not a managed watch, rather than 400-ing the route', async () => {
    const { services } = renderActivity({
      body: bothRuns,
      route: '/watches/activity?watchId=not-a-watch',
    });

    await waitFor(() =>
      expect(services.http.get).toHaveBeenCalledWith(
        PND_RUNS_URL,
        expect.objectContaining({ query: {} })
      )
    );
  });

  it('reads "Workflows unavailable" on a 503, never "no runs"', async () => {
    renderActivity({ error: createHttpFetchError({ status: 503 }) });

    expect(await screen.findByTestId('pndWorkflowsUnavailableState')).toBeInTheDocument();
  });

  it('renders an error state on a 500, explicitly not the empty state', async () => {
    renderActivity({ error: createHttpFetchError({ status: 500 }) });

    expect(await screen.findByTestId('pndErrorState')).toBeInTheDocument();
  });

  it('names the advanced setting when the ledger is empty because AD 2.0 is off in this space', async () => {
    renderActivity({
      body: { runs: [], total: 0 },
      headers: { [PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER]: 'false' },
    });

    expect(await screen.findByTestId('pndAttackDiscoveryDisabledState')).toBeInTheDocument();
  });

  it('renders the ordinary empty state for a genuinely empty ledger', async () => {
    renderActivity({
      body: { runs: [], total: 0 },
      headers: { [PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER]: 'true' },
    });

    expect(await screen.findByTestId('pndEmptyState')).toBeInTheDocument();
  });
});
