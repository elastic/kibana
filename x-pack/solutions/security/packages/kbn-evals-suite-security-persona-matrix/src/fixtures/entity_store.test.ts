/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';
import { ensureEntityStoreRunning } from './entity_store';

interface Req {
  method: string;
  path: string;
}

const log = {
  info: jest.fn(),
  warning: jest.fn(),
  debug: jest.fn(),
} as unknown as ToolingLog;

const createClient = ({
  installBehavior = 'ok',
  statuses = [],
}: {
  installBehavior?: 'ok' | 'conflict';
  /** Consecutive GET /status answers, replayed in order; further polls repeat the last. */
  statuses?: Array<string | Error>;
} = {}): { client: jest.Mock; requests: Req[] } => {
  const requests: Req[] = [];
  const client = {
    request: jest.fn(async ({ method, path }: Req) => {
      requests.push({ method, path });
      if (method === 'POST' && path === '/api/security/entity_store/install') {
        if (installBehavior === 'conflict') {
          throw Object.assign(new Error('Conflict: engine already exists'), { status: 409 });
        }
        return { data: {} };
      }
      if (method === 'GET' && path === '/api/security/entity_store/status') {
        const index = requests.filter((req) => req.method === 'GET').length - 1;
        const answer = statuses[Math.min(index, statuses.length - 1)];
        if (answer instanceof Error) throw answer;
        return { data: { status: answer } };
      }
      return { data: {} };
    }),
  };
  return { client: client as unknown as jest.Mock, requests };
};

const asKbn = (client: unknown): KbnClient => client as KbnClient;

describe('entity_store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('short-circuits without installing when the store already reports running', async () => {
    const { client, requests } = createClient({ statuses: ['running'] });
    await ensureEntityStoreRunning({
      kbnClient: asKbn(client),
      log,
      timeoutMs: 100,
      pollIntervalMs: 1,
    });
    expect(requests).toEqual([{ method: 'GET', path: '/api/security/entity_store/status' }]);
    expect(log.debug).toHaveBeenCalledWith('[persona-matrix] Entity Store is already running');
  });

  it('tolerates a 409 install and succeeds once status reaches running', async () => {
    const { client } = createClient({
      installBehavior: 'conflict',
      statuses: ['installing', 'running'],
    });
    await ensureEntityStoreRunning({
      kbnClient: asKbn(client),
      log,
      timeoutMs: 1_000,
      pollIntervalMs: 1,
    });
    expect(log.warning).toHaveBeenCalledWith(
      expect.stringContaining('Entity Store install request failed')
    );
    expect(log.info).toHaveBeenCalledWith('[persona-matrix] Entity Store is running');
  });

  it('throws when the store reports the error state', async () => {
    const { client } = createClient({ statuses: ['installing', 'error'] });
    await expect(
      ensureEntityStoreRunning({
        kbnClient: asKbn(client),
        log,
        timeoutMs: 1_000,
        pollIntervalMs: 1,
      })
    ).rejects.toThrow('Entity Store is in error state');
  });

  it('throws on timeout and names the last status-request failure', async () => {
    const { client } = createClient({ statuses: [new Error('socket hang up')] });
    await expect(
      ensureEntityStoreRunning({
        kbnClient: asKbn(client),
        log,
        timeoutMs: 10,
        pollIntervalMs: 1,
      })
    ).rejects.toThrow('timed out after 10ms waiting for Entity Store status=running');
    await expect(
      ensureEntityStoreRunning({
        kbnClient: asKbn(client),
        log,
        timeoutMs: 10,
        pollIntervalMs: 1,
      })
    ).rejects.toThrow('last status error: socket hang up');
  });
});
