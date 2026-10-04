/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { cleanupSeededData } from './cleanup';

const clientThat = (behavior: (params: { index?: string }) => void, calls: string[] = []): Client =>
  ({
    deleteByQuery: async (params: { index?: string }) => {
      calls.push(params.index ?? '');
      behavior(params);
      return { deleted: 0 };
    },
  } as unknown as Client);

describe('cleanupSeededData', () => {
  it('reclaims every seeded index by the shared agent-id prefix', async () => {
    const indices: string[] = [];
    await cleanupSeededData({ esClient: clientThat(() => {}, indices) });

    expect(indices.sort()).toEqual([
      'logs-endpoint.events.network-default',
      'logs-endpoint.events.process-default',
      'logs-endpoint.events.registry-default',
    ]);
  });

  it('tolerates an index that was never created', async () => {
    await expect(
      cleanupSeededData({
        esClient: clientThat(() => {
          throw Object.assign(new Error('no such index [logs-endpoint.events.registry-default]'), {
            meta: { statusCode: 404, body: { error: { type: 'index_not_found_exception' } } },
          });
        }),
      })
    ).resolves.toBeUndefined();
  });

  it('fails loudly instead of leaving stale telemetry behind', async () => {
    // Regression: the old `.catch(() => {})` scored a rejected cleanup as a
    // success, so stale documents survived and the next seed double-counted them.
    await expect(
      cleanupSeededData({
        esClient: clientThat(() => {
          throw Object.assign(new Error('security_exception'), {
            meta: { statusCode: 403, body: { error: { type: 'security_exception' } } },
          });
        }),
      })
    ).rejects.toThrow(/failed to delete seeded telemetry/);
  });
});
