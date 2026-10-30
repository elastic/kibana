/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { SourceWriteConflictError } from '../../../../lib/errors/source_write_conflict_error';
import { internalKIFeatureRoutes } from './route';

jest.mock('../../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const bulkAcrossRoute = internalKIFeatureRoutes['POST /internal/streams/features/_bulk'];

const makeParams = <T>(params: unknown, kiClient: Record<string, jest.Mock>) =>
  ({
    params,
    request: {},
    server: {},
    logger: loggingSystemMock.createLogger(),
    getScopedClients: jest.fn().mockResolvedValue({
      licensing: {},
      sourcesClient: { get: jest.fn() },
      getKnowledgeIndicatorClient: jest.fn().mockResolvedValue(kiClient),
    }),
  } as unknown as T);

describe('bulkFeaturesAcrossStreamsRoute', () => {
  it('counts retryable source conflicts apart from other failures and keeps the successful writes', async () => {
    const owners: Record<string, string> = {
      f1: 'logs.ok',
      f2: 'logs.busy',
      f3: 'logs.busy',
      f4: 'logs.disabled',
      f5: 'logs.broken',
    };
    const kiClient = {
      findFeaturesByIds: jest.fn(async (ids: string[]) =>
        ids.map((id) => ({ id, source_id: owners[id] }))
      ),
      bulk: jest.fn(async (sourceId: string) => {
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
      }),
      reconcileSource: jest.fn().mockResolvedValue(undefined),
    };

    await expect(
      bulkAcrossRoute.handler(
        makeParams<Parameters<typeof bulkAcrossRoute.handler>[0]>(
          { body: { operations: Object.keys(owners).map((id) => ({ delete: { id } })) } },
          kiClient
        )
      )
    ).resolves.toEqual({
      succeeded: 1,
      failed: 2,
      conflicts: 2,
      skipped: 0,
      failedIds: expect.arrayContaining(['f4', 'f5']),
      conflictIds: expect.arrayContaining(['f2', 'f3']),
    });

    expect(kiClient.bulk).toHaveBeenCalledTimes(4);
    expect(kiClient.reconcileSource).toHaveBeenCalledTimes(1);
    expect(kiClient.reconcileSource).toHaveBeenCalledWith('logs.ok');
  });

  it('routes a cross-source durability op to the source owning the uuid', async () => {
    const kiClient = {
      findFeaturesByIds: jest.fn().mockResolvedValue([{ id: 'u1', source_id: 'src-b' }]),
      bulk: jest.fn().mockResolvedValue({ applied: 1, skipped: 0 }),
      reconcileSource: jest.fn(),
    };

    const result = await bulkAcrossRoute.handler(
      makeParams<Parameters<typeof bulkAcrossRoute.handler>[0]>(
        { body: { operations: [{ durability: { id: 'u1', durable: true } }] } },
        kiClient
      )
    );

    expect(kiClient.bulk).toHaveBeenCalledWith('src-b', [
      { durability: { id: 'u1', durable: true } },
    ]);
    expect(kiClient.reconcileSource).not.toHaveBeenCalled();
    expect(result).toEqual({
      succeeded: 1,
      failed: 0,
      conflicts: 0,
      skipped: 0,
      failedIds: [],
      conflictIds: [],
    });
  });
});
