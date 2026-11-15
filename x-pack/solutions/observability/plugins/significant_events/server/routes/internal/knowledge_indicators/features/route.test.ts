/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SourceWriteConflictError } from '../../../../lib/errors/source_write_conflict_error';
import { internalKIFeatureRoutes } from './route';

jest.mock('../../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const bulkRoute = internalKIFeatureRoutes['POST /internal/streams/features/_bulk'];

describe('bulkFeaturesAcrossStreamsRoute', () => {
  it('counts retryable source conflicts apart from other failures and keeps the successful writes', async () => {
    const bulk = jest.fn(async (sourceId: string) => {
      switch (sourceId) {
        case 'logs.ok':
          return { applied: 1, skipped: 0 };
        case 'logs.busy':
          throw new SourceWriteConflictError('lease_held', 'being updated');
        case 'logs.disabled':
          throw new SourceWriteConflictError('source_disabled', 'disabled');
        default:
          throw new Error('storage write failed');
      }
    });
    const reconcileSource = jest.fn().mockResolvedValue(undefined);
    const owners: Record<string, string> = {
      f1: 'logs.ok',
      f2: 'logs.busy',
      f3: 'logs.busy',
      f4: 'logs.disabled',
      f5: 'logs.broken',
    };

    await expect(
      bulkRoute.handler({
        params: {
          body: { operations: Object.keys(owners).map((id) => ({ delete: { id } })) },
        },
        request: {},
        server: {},
        logger: { error: jest.fn(), warn: jest.fn() },
        getScopedClients: jest.fn().mockResolvedValue({
          licensing: {},
          sourcesClient: { get: jest.fn() },
          getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({
            findFeaturesByIds: jest.fn(async (ids: string[]) =>
              ids.map((id) => ({ id, source_id: owners[id] }))
            ),
            bulk,
            reconcileSource,
          }),
        }),
      } as never)
    ).resolves.toEqual({ succeeded: 1, failed: 2, conflicts: 2, skipped: 0 });

    expect(bulk).toHaveBeenCalledTimes(4);
    expect(reconcileSource).toHaveBeenCalledTimes(1);
    expect(reconcileSource).toHaveBeenCalledWith('logs.ok');
  });
});
