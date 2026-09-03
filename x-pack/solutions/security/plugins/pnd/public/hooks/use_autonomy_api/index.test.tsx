/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import {
  API_VERSIONS,
  PND_AUTONOMY_URL,
  PND_PROPOSALS_AUTO_RESPOND_URL,
  SYSTEM_SECURITY_WATCH_DEEP_ID,
} from '@kbn/pnd-common';
import type { AutoRespondToProposalsResponse, GetAutonomyResponse } from '@kbn/pnd-common';
import { queryKeys } from '../../query_keys';
import {
  createPndProvidersWrapper,
  createPndTestQueryClient,
  createPndTestServices,
} from '../../test_helpers/render_with_providers';
import { useAutonomy, useAutoRespondToProposals, useSetAutonomy } from '.';

const autonomyResponse: GetAutonomyResponse = {
  autoAccept: { incident_contained: false, open_investigation: true, promote_incident: true },
  autonomyLevel: 'supervised',
  watchId: SYSTEM_SECURITY_WATCH_DEEP_ID,
};

const autoRespondResponse: AutoRespondToProposalsResponse = { approved: 2, skipped: 1 };

describe('useAutonomy', () => {
  it('reads the level from GET /internal/pnd/autonomy for the watch', async () => {
    const services = createPndTestServices();
    services.http.get.mockResolvedValue(autonomyResponse);

    const { result } = renderHook(() => useAutonomy(SYSTEM_SECURITY_WATCH_DEEP_ID), {
      wrapper: createPndProvidersWrapper({ services }),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(services.http.get).toHaveBeenCalledWith(PND_AUTONOMY_URL, {
      query: { watchId: SYSTEM_SECURITY_WATCH_DEEP_ID },
      version: API_VERSIONS.internal.v1,
    });
  });

  it('returns the persisted level, which may disagree with the projection', async () => {
    const services = createPndTestServices();
    services.http.get.mockResolvedValue(autonomyResponse);

    const { result } = renderHook(() => useAutonomy(SYSTEM_SECURITY_WATCH_DEEP_ID), {
      wrapper: createPndProvidersWrapper({ services }),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(autonomyResponse);
  });

  it('never fetches for a watch id outside the managed allow-list, which the route would 400', () => {
    const services = createPndTestServices();

    renderHook(() => useAutonomy('custom-watch-abc'), {
      wrapper: createPndProvidersWrapper({ services }),
    });

    expect(services.http.get).not.toHaveBeenCalled();
  });

  it('never fetches before the route param resolves', () => {
    const services = createPndTestServices();

    renderHook(() => useAutonomy(undefined), {
      wrapper: createPndProvidersWrapper({ services }),
    });

    expect(services.http.get).not.toHaveBeenCalled();
  });
});

describe('useSetAutonomy', () => {
  it('writes the level with PUT /internal/pnd/autonomy', async () => {
    const services = createPndTestServices();
    services.http.put.mockResolvedValue({ ...autonomyResponse, autonomyLevel: 'assisted' });

    const { result } = renderHook(() => useSetAutonomy(), {
      wrapper: createPndProvidersWrapper({ services }),
    });
    await act(async () => {
      await result.current.mutateAsync({
        autonomyLevel: 'assisted',
        watchId: SYSTEM_SECURITY_WATCH_DEEP_ID,
      });
    });

    expect(services.http.put).toHaveBeenCalledWith(PND_AUTONOMY_URL, {
      body: JSON.stringify({ autonomyLevel: 'assisted', watchId: SYSTEM_SECURITY_WATCH_DEEP_ID }),
      version: API_VERSIONS.internal.v1,
    });
  });

  it("seeds the autonomy cache with the route's own answer, so the dial shows what was persisted", async () => {
    const services = createPndTestServices();
    const persisted = { ...autonomyResponse, autonomyLevel: 'assisted' };
    services.http.put.mockResolvedValue(persisted);
    const queryClient = createPndTestQueryClient();

    const { result } = renderHook(() => useSetAutonomy(), {
      wrapper: createPndProvidersWrapper({ queryClient, services }),
    });
    await act(async () => {
      await result.current.mutateAsync({
        autonomyLevel: 'assisted',
        watchId: SYSTEM_SECURITY_WATCH_DEEP_ID,
      });
    });

    expect(
      queryClient.getQueryData(queryKeys.autonomy.detail(SYSTEM_SECURITY_WATCH_DEEP_ID))
    ).toEqual(persisted);
  });

  it('rejects when the write is denied, so the caller can toast a 403 rather than claim success', async () => {
    const services = createPndTestServices();
    services.http.put.mockRejectedValue(new Error('Forbidden'));

    const { result } = renderHook(() => useSetAutonomy(), {
      wrapper: createPndProvidersWrapper({ services }),
    });

    await expect(
      result.current.mutateAsync({
        autonomyLevel: 'supervised',
        watchId: SYSTEM_SECURITY_WATCH_DEEP_ID,
      })
    ).rejects.toThrow('Forbidden');
  });
});

describe('useAutoRespondToProposals', () => {
  it('posts to POST /internal/pnd/proposals/_auto_respond', async () => {
    const services = createPndTestServices();
    services.http.post.mockResolvedValue(autoRespondResponse);

    const { result } = renderHook(() => useAutoRespondToProposals(), {
      wrapper: createPndProvidersWrapper({ services }),
    });
    await act(async () => {
      await result.current.mutateAsync({
        origin: 'dial',
        watchId: SYSTEM_SECURITY_WATCH_DEEP_ID,
      });
    });

    expect(services.http.post).toHaveBeenCalledWith(PND_PROPOSALS_AUTO_RESPOND_URL, {
      body: JSON.stringify({ origin: 'dial', watchId: SYSTEM_SECURITY_WATCH_DEEP_ID }),
      version: API_VERSIONS.internal.v1,
    });
  });

  it('invalidates the proposals queue, because an auto-responded gate is no longer pending', async () => {
    const services = createPndTestServices();
    services.http.post.mockResolvedValue(autoRespondResponse);
    const queryClient = createPndTestQueryClient();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useAutoRespondToProposals(), {
      wrapper: createPndProvidersWrapper({ queryClient, services }),
    });
    await act(async () => {
      await result.current.mutateAsync({
        origin: 'dial',
        watchId: SYSTEM_SECURITY_WATCH_DEEP_ID,
      });
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.proposals.all });
  });

  it('invalidates the runs list too, because `_auto_respond` resumes executions without returning a run id', async () => {
    const services = createPndTestServices();
    services.http.post.mockResolvedValue(autoRespondResponse);
    const queryClient = createPndTestQueryClient();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useAutoRespondToProposals(), {
      wrapper: createPndProvidersWrapper({ queryClient, services }),
    });
    await act(async () => {
      await result.current.mutateAsync({
        origin: 'dial',
        watchId: SYSTEM_SECURITY_WATCH_DEEP_ID,
      });
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.runs.all });
  });
});
