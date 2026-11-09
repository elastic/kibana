/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { CpsTelemetryContextProvider } from './cps_telemetry_context';

const request = { spaceId: 'space-a' } as KibanaRequest;

describe('CpsTelemetryContextProvider', () => {
  it('adds only the space outside CPS', () => {
    const provider = new CpsTelemetryContextProvider({
      cpsEnabled: false,
      getLinkedProjectIds: jest.fn(),
    });

    expect(provider.get(request, 'all')).toEqual({ space_id: 'space-a' });
  });

  it('identifies the origin project for origin-scoped operations', () => {
    const provider = new CpsTelemetryContextProvider({
      cpsEnabled: true,
      originProjectId: 'origin-project',
      getLinkedProjectIds: jest.fn(),
    });

    expect(provider.get(request, 'origin')).toEqual({
      space_id: 'space-a',
      target_cluster_scope: 'origin',
      target_cluster_ids: ['origin-project'],
      target_cluster_ids_complete: true,
    });
  });

  it('deduplicates all CPS target projects and caches them per request', async () => {
    const getLinkedProjectIds = jest
      .fn()
      .mockResolvedValue(['linked-project', 'origin-project', 'linked-project']);
    const provider = new CpsTelemetryContextProvider({
      cpsEnabled: true,
      originProjectId: 'origin-project',
      getLinkedProjectIds,
    });

    await expect(provider.get(request, 'all')).resolves.toEqual({
      space_id: 'space-a',
      target_cluster_scope: 'all',
      target_cluster_ids: ['origin-project', 'linked-project'],
      target_cluster_ids_complete: true,
    });
    await provider.get(request, 'all');

    expect(getLinkedProjectIds).toHaveBeenCalledTimes(1);
  });

  it('marks the target set incomplete when linked projects cannot be resolved', async () => {
    const provider = new CpsTelemetryContextProvider({
      cpsEnabled: true,
      originProjectId: 'origin-project',
      getLinkedProjectIds: jest.fn().mockResolvedValue(undefined),
    });

    await expect(provider.get(request, 'all')).resolves.toEqual({
      space_id: 'space-a',
      target_cluster_scope: 'all',
      target_cluster_ids: ['origin-project'],
      target_cluster_ids_complete: false,
    });
  });
});
