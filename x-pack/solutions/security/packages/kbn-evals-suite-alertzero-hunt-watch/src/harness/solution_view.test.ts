/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';
import { ensureSecuritySolutionView, restoreSolutionView } from './solution_view';

interface Req {
  path: string;
  method?: string;
  headers?: Record<string, string>;
  body?: { solution?: string };
}

const log = {
  info: jest.fn(),
  warning: jest.fn(),
} as unknown as ToolingLog;

const makeServer = ({
  solution,
  flavor = 'traditional',
  putWorks = true,
  putThrows = false,
}: {
  solution?: string;
  flavor?: string;
  putWorks?: boolean;
  putThrows?: boolean;
}) => {
  const requests: Req[] = [];
  const state: { solution?: string } = { solution };
  const request = jest.fn(async (req: Req) => {
    requests.push(req);
    if (req.path === '/api/status') return { data: { version: { build_flavor: flavor } } };
    if (req.path === '/api/spaces/space/default' && req.method === 'GET') {
      return { data: { id: 'default', ...(state.solution ? { solution: state.solution } : {}) } };
    }
    if (req.path === '/internal/spaces/space/default/solution' && req.method === 'PUT') {
      if (putThrows) throw new Error('boom');
      if (putWorks) state.solution = req.body?.solution;
      return { data: {} };
    }
    throw new Error(`unexpected request ${req.method} ${req.path}`);
  });
  return { kbnClient: { request } as unknown as KbnClient, requests, state };
};

const puts = (requests: Req[]) =>
  requests.filter((r) => r.method === 'PUT').map((r) => r.body?.solution);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ensureSecuritySolutionView', () => {
  it('switches a Classic default space (no solution) to security and remembers classic', async () => {
    const { kbnClient, requests, state } = makeServer({});
    const prior = await ensureSecuritySolutionView(kbnClient, log);
    expect(state.solution).toBe('security');
    expect(prior).toEqual({ previous: 'classic' });
    expect(puts(requests)).toEqual(['security']);
  });

  it('leaves a space that already has the security view untouched', async () => {
    const { kbnClient, requests } = makeServer({ solution: 'security' });
    expect(await ensureSecuritySolutionView(kbnClient, log)).toEqual({});
    expect(puts(requests)).toEqual([]);
  });

  it('changes nothing on serverless', async () => {
    const { kbnClient, requests } = makeServer({ flavor: 'serverless' });
    expect(await ensureSecuritySolutionView(kbnClient, log)).toEqual({});
    expect(requests.map((r) => r.path)).toEqual(['/api/status']);
  });

  it('throws when the view did not change, naming the 404 it would cause', async () => {
    const { kbnClient, requests } = makeServer({ solution: 'oblt', putWorks: false });
    await expect(ensureSecuritySolutionView(kbnClient, log)).rejects.toThrow(
      /still has solution view 'oblt'.*404/
    );
    // the attempted switch is undone before throwing, since teardown never runs
    expect(puts(requests)).toEqual(['security', 'oblt']);
  });

  it('sends the public spaces API version on the read and the internal origin on the write', async () => {
    const { kbnClient, requests } = makeServer({});
    await ensureSecuritySolutionView(kbnClient, log);
    const get = requests.find((r) => r.method === 'GET' && r.path.startsWith('/api/spaces/'));
    const put = requests.find((r) => r.method === 'PUT');
    expect(get?.headers).toEqual({ 'elastic-api-version': '2023-10-31' });
    expect(put?.headers).toMatchObject({ 'x-elastic-internal-origin': 'Kibana' });
  });
});

describe('restoreSolutionView', () => {
  it('puts back the view setup replaced', async () => {
    const { kbnClient, state } = makeServer({});
    const prior = await ensureSecuritySolutionView(kbnClient, log);
    await restoreSolutionView(kbnClient, log, prior);
    expect(state.solution).toBe('classic');
  });

  it('restores a non-classic previous view with that exact solution', async () => {
    const { kbnClient, requests, state } = makeServer({ solution: 'oblt' });
    const prior = await ensureSecuritySolutionView(kbnClient, log);
    await restoreSolutionView(kbnClient, log, prior);
    expect(puts(requests)).toEqual(['security', 'oblt']);
    expect(state.solution).toBe('oblt');
  });

  it('does nothing when setup changed nothing', async () => {
    const { kbnClient, requests } = makeServer({ solution: 'security' });
    await restoreSolutionView(kbnClient, log, {});
    expect(requests).toEqual([]);
  });

  it('logs instead of throwing when the restore fails', async () => {
    const { kbnClient } = makeServer({ putThrows: true });
    await expect(
      restoreSolutionView(kbnClient, log, { previous: 'classic' })
    ).resolves.toBeUndefined();
    expect(log.warning).toHaveBeenCalledWith(expect.stringContaining("'classic'"));
  });
});
