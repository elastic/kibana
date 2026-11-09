/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';
import { personaMatrixDataset } from '../datasets';
import { ensureEntityStoreRunning, examplesNeedEntityStore } from './entity_store';

interface Req {
  method: string;
  path: string;
}

interface Engine {
  type: string;
  status: string;
  nonPriority?: { status: string } | null;
}

const INSTALL = { method: 'POST', path: '/api/security/entity_store/install' };
const START = { method: 'PUT', path: '/api/security/entity_store/start' };
const STATUS = { method: 'GET', path: '/api/security/entity_store/status' };

const log = {
  info: jest.fn(),
  warning: jest.fn(),
  debug: jest.fn(),
} as unknown as ToolingLog;

/** Mirrors the server's aggregate: running when any engine is started, stopped only when all are. */
const aggregate = (engines: Engine[]): string => {
  if (engines.length === 0) return 'not_installed';
  if (engines.some(({ status }) => status === 'error')) return 'error';
  if (engines.some(({ status }) => status === 'installing')) return 'installing';
  if (engines.some(({ status }) => status === 'started')) return 'running';
  return 'stopped';
};

/**
 * Stateful Entity Store double. Install is a no-op once engines exist (like the
 * real route, it neither fails nor restarts stopped engines); start flips every
 * stopped engine and non-priority process to started.
 */
const createClient = ({
  engines: initialEngines = [],
  installBehavior = 'ok',
  startBehavior = 'ok',
  startLagPolls = 0,
  statusOverrides = [],
}: {
  engines?: Engine[];
  installBehavior?: 'ok' | 'conflict';
  startBehavior?: 'ok' | 'fail';
  /** Status polls after start before stopped processes report started (start is asynchronous). */
  startLagPolls?: number;
  /** Consecutive GET /status answers that replace the derived body, in order. */
  statusOverrides?: Array<string | Error>;
} = {}): { client: unknown; requests: Req[] } => {
  const requests: Req[] = [];
  let engines: Engine[] = initialEngines.map((engine) => ({ ...engine }));
  let statusCalls = 0;
  let pendingStartPolls: number | undefined;
  const applyStart = () => {
    engines = engines.map((engine) => ({
      ...engine,
      status: engine.status === 'stopped' ? 'started' : engine.status,
      nonPriority:
        engine.nonPriority?.status === 'stopped' ? { status: 'started' } : engine.nonPriority,
    }));
  };
  const client = {
    request: jest.fn(async ({ method, path }: Req) => {
      requests.push({ method, path });
      if (method === INSTALL.method && path === INSTALL.path) {
        if (installBehavior === 'conflict') {
          throw Object.assign(new Error('Conflict: engine already exists'), { status: 409 });
        }
        if (engines.length === 0) {
          engines = [
            { type: 'host', status: 'started' },
            { type: 'user', status: 'started' },
          ];
        }
        return { data: { ok: true } };
      }
      if (method === START.method && path === START.path) {
        if (startBehavior === 'fail') {
          throw new Error('Forbidden');
        }
        pendingStartPolls = startLagPolls;
        if (pendingStartPolls === 0) applyStart();
        return { data: { ok: true } };
      }
      if (method === STATUS.method && path === STATUS.path) {
        if (pendingStartPolls !== undefined && pendingStartPolls-- === 0) applyStart();
        const override = statusOverrides[statusCalls++];
        if (override instanceof Error) throw override;
        if (override !== undefined) return { data: { status: override, engines: [] } };
        return { data: { status: aggregate(engines), engines } };
      }
      return { data: {} };
    }),
  };
  return { client, requests };
};

const run = (client: unknown, timeoutMs = 1_000): Promise<void> =>
  ensureEntityStoreRunning({
    kbnClient: client as KbnClient,
    log,
    timeoutMs,
    pollIntervalMs: 1,
  });

describe('entity_store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('installs, then starts, then confirms a fresh store is running', async () => {
    const { client, requests } = createClient();
    await run(client);
    expect(requests.slice(0, 3)).toEqual([INSTALL, START, STATUS]);
    expect(log.info).toHaveBeenCalledWith('[persona-matrix] Entity Store is running');
  });

  it('restarts a fully stopped store that install leaves untouched', async () => {
    const { client, requests } = createClient({
      engines: [
        { type: 'host', status: 'stopped' },
        { type: 'user', status: 'stopped' },
      ],
    });
    await run(client);
    expect(requests).toContainEqual(START);
    expect(log.info).toHaveBeenCalledWith('[persona-matrix] Entity Store is running');
  });

  const statusPolls = (requests: Req[]) => requests.filter((req) => req.method === 'GET').length;

  it('waits for a stopped engine even when the aggregate status already reads running', async () => {
    const { client, requests } = createClient({
      engines: [
        { type: 'host', status: 'stopped' },
        { type: 'user', status: 'started' },
      ],
      startLagPolls: 2,
    });
    await run(client);
    expect(requests.slice(0, 2)).toEqual([INSTALL, START]);
    // Two polls still see host stopped under an aggregate `running`; only the third is ready.
    expect(statusPolls(requests)).toBe(3);
  });

  it('waits for a stopped non-priority process behind a started engine', async () => {
    const { client, requests } = createClient({
      engines: [{ type: 'user', status: 'started', nonPriority: { status: 'stopped' } }],
      startLagPolls: 2,
    });
    await run(client);
    expect(requests).toContainEqual(START);
    expect(statusPolls(requests)).toBe(3);
  });

  it('times out naming the stopped engines when start fails', async () => {
    const { client } = createClient({
      engines: [
        { type: 'host', status: 'stopped' },
        { type: 'user', status: 'started' },
      ],
      startBehavior: 'fail',
    });
    await expect(run(client, 20)).rejects.toThrow('stopped engines: host');
    expect(log.warning).toHaveBeenCalledWith(
      expect.stringContaining('Entity Store start request failed')
    );
  });

  it('tolerates a 409 install and succeeds once status reaches running', async () => {
    const { client } = createClient({
      engines: [{ type: 'host', status: 'started' }],
      installBehavior: 'conflict',
      statusOverrides: ['installing'],
    });
    await run(client);
    expect(log.warning).toHaveBeenCalledWith(
      expect.stringContaining('Entity Store install request failed')
    );
    expect(log.info).toHaveBeenCalledWith('[persona-matrix] Entity Store is running');
  });

  it('throws when the store reports the error state', async () => {
    const { client } = createClient({ statusOverrides: ['installing', 'error'] });
    await expect(run(client)).rejects.toThrow('Entity Store is in error state');
  });

  it('throws on timeout and names the last status-request failure', async () => {
    const failures = Array.from({ length: 10_000 }, () => new Error('socket hang up'));
    const { client } = createClient({ statusOverrides: failures });
    const error = await run(client, 10).catch((err: Error) => err);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain(
      'timed out after 10ms waiting for Entity Store status=running'
    );
    expect((error as Error).message).toContain('last status error: socket hang up');
  });
});

describe('examplesNeedEntityStore', () => {
  const example = (expectedTools?: string[]) => ({ metadata: { expectedTools } });

  it('flags examples that expect an entity tool', () => {
    expect(examplesNeedEntityStore([example(['security.alerts', 'security.get_entity'])])).toBe(
      true
    );
    expect(examplesNeedEntityStore([example(['security.search_entities'])])).toBe(true);
    expect(examplesNeedEntityStore([example(['security.get_entity_risk_score_history'])])).toBe(
      true
    );
  });

  it('ignores examples without entity tools', () => {
    expect(examplesNeedEntityStore([example(['security.alerts']), example(), {}])).toBe(false);
  });

  it('covers every dataset example whose tools the entity store gates', () => {
    const entityExamples = personaMatrixDataset.filter((ex) => examplesNeedEntityStore([ex]));
    expect(entityExamples.length).toBeGreaterThan(0);
    for (const ex of personaMatrixDataset) {
      const usesEntityTool = (ex.metadata.expectedTools ?? []).some((toolId) =>
        toolId.includes('entit')
      );
      expect(examplesNeedEntityStore([ex])).toBe(usesEntityTool);
    }
  });
});
