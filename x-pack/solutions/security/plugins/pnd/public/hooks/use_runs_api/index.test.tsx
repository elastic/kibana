/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import {
  API_VERSIONS,
  PND_RUNS_URL,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
} from '@kbn/pnd-common';
import type { ListRunsResponse, PndRun } from '@kbn/pnd-common';

import { PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER } from '../../../common/constants';
import { createHttpFetchError } from '../../test_helpers/create_http_fetch_error';
import { createHttpResponse } from '../../test_helpers/create_http_response';
import {
  createPndProvidersWrapper,
  createPndTestServices,
} from '../../test_helpers/render_with_providers';
import { useRuns } from '.';

const run: PndRun = {
  correlationId: 'alert-1',
  deepLinkPath:
    '/system-security-watch-deep?tab=executions&executionId=run-1&stepExecutionId=step-exec-1',
  executionId: 'run-1',
  pendingGateCount: 1,
  startedAt: '2026-08-03T12:00:00.000Z',
  status: 'waiting_for_input',
  summary: 'Credential dumping on host-1',
  watchId: 'system-security-watch-deep',
  workflowId: 'system-security-watch-deep',
  workflowRunId: 'run-1',
};

const listResponse: ListRunsResponse = { runs: [run], total: 1 };

describe('useRuns', () => {
  it('reads the ledger from GET /internal/pnd/runs with asResponse, the only way to see the signal header', async () => {
    const services = createPndTestServices();
    services.http.get.mockResolvedValue(createHttpResponse({ body: listResponse }));

    const { result } = renderHook(() => useRuns(), {
      wrapper: createPndProvidersWrapper({ services }),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(services.http.get).toHaveBeenCalledWith(PND_RUNS_URL, {
      asResponse: true,
      query: {},
      version: API_VERSIONS.internal.v1,
    });
  });

  it('returns the runs', async () => {
    const services = createPndTestServices();
    services.http.get.mockResolvedValue(createHttpResponse({ body: listResponse }));

    const { result } = renderHook(() => useRuns(), {
      wrapper: createPndProvidersWrapper({ services }),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.runs).toEqual(listResponse);
  });

  it('sends the watch filter server-side, because it is part of the query contract', async () => {
    const services = createPndTestServices();
    services.http.get.mockResolvedValue(createHttpResponse({ body: listResponse }));

    const { result } = renderHook(
      () => useRuns({ watchId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID }),
      {
        wrapper: createPndProvidersWrapper({ services }),
      }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(services.http.get).toHaveBeenCalledWith(
      PND_RUNS_URL,
      expect.objectContaining({ query: { watchId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID } })
    );
  });

  it('sends an explicit size when one is asked for', async () => {
    const services = createPndTestServices();
    services.http.get.mockResolvedValue(createHttpResponse({ body: listResponse }));

    const { result } = renderHook(() => useRuns({ size: 10 }), {
      wrapper: createPndProvidersWrapper({ services }),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(services.http.get).toHaveBeenCalledWith(
      PND_RUNS_URL,
      expect.objectContaining({ query: { size: 10 } })
    );
  });

  it('reads `false` off the attack-discovery-workflows header, so an empty ledger can be told from a disabled feature', async () => {
    const services = createPndTestServices();
    services.http.get.mockResolvedValue(
      createHttpResponse({
        body: { runs: [], total: 0 },
        headers: { [PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER]: 'false' },
      })
    );

    const { result } = renderHook(() => useRuns(), {
      wrapper: createPndProvidersWrapper({ services }),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.isAttackDiscoveryWorkflowsEnabled).toBe(false);
  });

  it('leaves the flag undefined when the header is absent', async () => {
    const services = createPndTestServices();
    services.http.get.mockResolvedValue(createHttpResponse({ body: listResponse }));

    const { result } = renderHook(() => useRuns(), {
      wrapper: createPndProvidersWrapper({ services }),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.isAttackDiscoveryWorkflowsEnabled).toBeUndefined();
  });

  it('falls back to an empty ledger when the response carries no body', async () => {
    const services = createPndTestServices();
    services.http.get.mockResolvedValue(createHttpResponse<ListRunsResponse>({}));

    const { result } = renderHook(() => useRuns(), {
      wrapper: createPndProvidersWrapper({ services }),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.runs).toEqual({ runs: [], total: 0 });
  });

  it('surfaces a 503 as an error, never as an empty ledger', async () => {
    const services = createPndTestServices();
    services.http.get.mockRejectedValue(createHttpFetchError({ status: 503 }));

    const { result } = renderHook(() => useRuns(), {
      wrapper: createPndProvidersWrapper({ services }),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
