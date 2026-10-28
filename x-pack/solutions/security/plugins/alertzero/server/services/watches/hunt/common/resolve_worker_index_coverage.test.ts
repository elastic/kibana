/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { getHuntAccountLabel, resolveWorkerIndexCoverage } from './resolve_worker_index_coverage';

const responseError = (statusCode: number) =>
  new errors.ResponseError({ statusCode, body: {}, headers: {}, warnings: [], meta: {} as never });

const resolved = (...dataStreams: string[]) => ({
  indices: [],
  aliases: [],
  data_streams: dataStreams.map((name) => ({ name, backing_indices: [], timestamp_field: '' })),
});

const statefulRole = { indices: [{ names: ['logs-*'], privileges: ['read'] }] };

const sweepScope = (overrides: Record<string, unknown>) => ({
  status: 'ok',
  resolution: 'universe',
  index_patterns: ['logs-*', 'custom-*'],
  missing: [],
  report_matches: [],
  actionable_indices: [],
  window: { from: '2026-01-01T00:00:00.000Z', to: '2026-01-31T00:00:00.000Z' },
  row_limit: 25,
  ...overrides,
});

const setup = ({
  universe = ['logs-*', 'custom-*'],
  callerResolves = resolved('logs-x'),
  role = statefulRole as unknown,
  sweep,
  workflowId = 'wf-1',
}: {
  universe?: string[];
  callerResolves?: unknown;
  role?: unknown;
  sweep?: { scope?: unknown; noExecution?: boolean; listThrows?: boolean };
  workflowId?: string | null;
} = {}) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  if (callerResolves instanceof Error) {
    esClient.indices.resolveIndex.mockRejectedValue(callerResolves);
  } else {
    esClient.indices.resolveIndex.mockResolvedValue(callerResolves as never);
  }
  if (role instanceof Error) {
    esClient.security.getRole.mockRejectedValue(role);
  } else {
    esClient.security.getRole.mockResolvedValue(
      (role ? { alertzero_threat_hunt: role } : {}) as never
    );
  }
  esClient.security.queryRole.mockResolvedValue({ roles: [] } as never);
  const management = {
    getLatestFinishedWorkflowExecution: jest.fn(),
    getLatestWorkflowExecution: jest.fn(),
    getWorkflowExecution: jest.fn(),
  };
  if (sweep?.listThrows) {
    management.getLatestFinishedWorkflowExecution.mockRejectedValue(new Error('boom'));
  } else {
    management.getLatestFinishedWorkflowExecution.mockResolvedValue(
      sweep && !sweep.noExecution ? { id: 'exec-1' } : undefined
    );
  }
  management.getWorkflowExecution.mockResolvedValue({
    startedAt: 's',
    finishedAt: 'f',
    stepExecutions: sweep?.scope
      ? [
          {
            stepId: 'check_index_scope',
            startedAt: 's',
            finishedAt: 'swept-at',
            output: sweep.scope,
          },
        ]
      : [],
  });
  const logger = loggingSystemMock.createLogger();
  const run = (overrides: Record<string, unknown> = {}) =>
    resolveWorkerIndexCoverage({
      esClient,
      management: management as never,
      request: httpServerMock.createKibanaRequest(),
      spaceId: 'default',
      indexPatterns: universe,
      workflowId,
      serviceAccountId: 'kibana/alertzero_threat_hunt',
      roleName: 'alertzero_threat_hunt',
      isServerless: false,
      logger,
      ...overrides,
    });
  return { esClient, management, logger, run };
};

describe('getHuntAccountLabel', () => {
  it('uses a stored service account id of namespace/name shape', () => {
    expect(getHuntAccountLabel({ serviceAccountId: 'kibana/alertzero_threat_hunt' })).toBe(
      'kibana/alertzero_threat_hunt'
    );
  });

  it('uses the account name for an opaque id', () => {
    expect(getHuntAccountLabel({ serviceAccountId: 'uiam-opaque-id' })).toBe(
      'alertzero_threat_hunt'
    );
  });

  it('uses the account name, never the role name, for a null id', () => {
    expect(getHuntAccountLabel({ serviceAccountId: null })).toBe('alertzero_threat_hunt');
  });
});

describe('resolveWorkerIndexCoverage', () => {
  it('resolves as the caller with the same options as the sweep', async () => {
    const { esClient, run } = setup();
    await run();
    expect(esClient.indices.resolveIndex).toHaveBeenCalledWith({
      name: ['logs-*', 'custom-*'],
      allow_no_indices: true,
      expand_wildcards: ['open'],
    });
  });

  describe('sweep path', () => {
    it('answers from the last sweep when it evaluated the current universe', async () => {
      const { run } = setup({
        callerResolves: resolved('logs-x', 'custom-a'),
        role: { indices: [{ names: ['logs-*'], privileges: ['read'] }] },
        sweep: { scope: sweepScope({ missing: ['custom-*'] }) },
      });
      await expect(run()).resolves.toMatchObject({
        source: 'last_sweep',
        checked_at: 'swept-at',
        unreadable_by_worker: ['custom-*'],
        missing_for_everyone: [],
      });
    });

    it('drops a pattern the readable role covers (stale sweep)', async () => {
      const { run } = setup({
        callerResolves: resolved('logs-x', 'custom-a'),
        role: { indices: [{ names: ['logs-*', 'custom-*'], privileges: ['read'] }] },
        sweep: { scope: sweepScope({ missing: ['custom-*'] }) },
      });
      await expect(run()).resolves.toMatchObject({ unreadable_by_worker: [] });
    });

    it('applies the plain subtraction when the role is unreadable', async () => {
      const { run } = setup({
        callerResolves: resolved('logs-x', 'custom-a'),
        role: responseError(403),
        sweep: { scope: sweepScope({ missing: ['custom-*'] }) },
      });
      await expect(run()).resolves.toMatchObject({
        source: 'last_sweep',
        unreadable_by_worker: ['custom-*'],
      });
    });

    it('applies the plain subtraction and warns when the role read throws', async () => {
      const { run, logger } = setup({
        callerResolves: resolved('logs-x', 'custom-a'),
        role: responseError(500),
        sweep: { scope: sweepScope({ missing: ['custom-*'] }) },
      });
      await expect(run()).resolves.toMatchObject({
        source: 'last_sweep',
        unreadable_by_worker: ['custom-*'],
      });
      expect(logger.warn).toHaveBeenCalledTimes(1);
    });

    it('removes patterns that are missing for everyone', async () => {
      const { run } = setup({
        callerResolves: resolved('logs-x'),
        sweep: { scope: sweepScope({ missing: ['custom-*'] }) },
      });
      await expect(run()).resolves.toMatchObject({
        unreadable_by_worker: [],
        missing_for_everyone: ['custom-*'],
      });
    });

    it('treats the whole universe as the evaluated one for a blocked:empty_universe sweep', async () => {
      const { run } = setup({
        callerResolves: resolved('logs-x', 'custom-a'),
        role: { indices: [] },
        sweep: {
          scope: sweepScope({
            status: 'blocked',
            resolution: 'blocked:empty_universe',
            index_patterns: [],
            missing: ['logs-*', 'custom-*'],
          }),
        },
      });
      await expect(run()).resolves.toMatchObject({
        source: 'last_sweep',
        unreadable_by_worker: ['logs-*', 'custom-*'],
      });
    });

    it('only reads the finished-execution lookup, never the any-status one', async () => {
      const { run, management } = setup({ sweep: { scope: sweepScope({}) } });
      await run();
      expect(management.getLatestFinishedWorkflowExecution).toHaveBeenCalled();
    });

    it.each([
      [
        'a blocked:discovery_failed sweep',
        { scope: sweepScope({ status: 'blocked', resolution: 'blocked:discovery_failed' }) },
      ],
      ['a sweep of a different universe', { scope: sweepScope({ index_patterns: ['other-*'] }) }],
      ['no finished execution', { noExecution: true }],
      ['a throwing lookup', { listThrows: true }],
    ])('falls back to the role for %s', async (_name, sweep) => {
      const { run } = setup({ sweep });
      await expect(run()).resolves.toMatchObject({ source: 'role' });
    });

    it('falls back to the role without a workflow id', async () => {
      const { run, management } = setup({ workflowId: null, sweep: { scope: sweepScope({}) } });
      await expect(run()).resolves.toMatchObject({ source: 'role' });
      expect(management.getLatestFinishedWorkflowExecution).not.toHaveBeenCalled();
    });

    it('falls back to the role without a management client', async () => {
      const { run } = setup({ sweep: { scope: sweepScope({}) } });
      await expect(run({ management: undefined })).resolves.toMatchObject({ source: 'role' });
    });
  });

  describe('role path', () => {
    it('lists uncovered patterns the caller can resolve', async () => {
      const { run } = setup({ callerResolves: resolved('logs-x', 'custom-a') });
      await expect(run()).resolves.toMatchObject({
        source: 'role',
        unreadable_by_worker: ['custom-*'],
        missing_for_everyone: [],
      });
    });

    it('removes patterns that are missing for everyone', async () => {
      const { run } = setup({ callerResolves: resolved('logs-x') });
      await expect(run()).resolves.toMatchObject({
        unreadable_by_worker: [],
        missing_for_everyone: ['custom-*'],
      });
    });

    it('is unavailable when the role cannot be read, keeping the caller result', async () => {
      const { run } = setup({ role: null });
      await expect(run()).resolves.toMatchObject({
        source: 'unavailable',
        unavailable_reason: 'role_unreadable',
        checked_at: null,
        unreadable_by_worker: [],
        missing_for_everyone: ['custom-*'],
      });
    });

    it('rejects when the role read throws', async () => {
      const { run } = setup({ role: responseError(500) });
      await expect(run()).rejects.toThrow();
    });
  });

  describe('caller view', () => {
    it('is unavailable as discovery_failed when the resolve throws a non-403, without reading anything else', async () => {
      const { run, esClient, management } = setup({ callerResolves: new Error('no remote') });
      await expect(run()).resolves.toMatchObject({
        source: 'unavailable',
        unavailable_reason: 'discovery_failed',
        missing_for_everyone: ['logs-*', 'custom-*'],
        unreadable_by_worker: [],
      });
      expect(esClient.security.getRole).not.toHaveBeenCalled();
      expect(management.getLatestFinishedWorkflowExecution).not.toHaveBeenCalled();
    });

    it('is unavailable as caller_unreadable on a 403, without reading anything else', async () => {
      const { run, esClient, management } = setup({ callerResolves: responseError(403) });
      await expect(run()).resolves.toMatchObject({
        source: 'unavailable',
        unavailable_reason: 'caller_unreadable',
        missing_for_everyone: [],
        unreadable_by_worker: [],
      });
      expect(esClient.security.getRole).not.toHaveBeenCalled();
      expect(management.getLatestFinishedWorkflowExecution).not.toHaveBeenCalled();
    });
  });

  it('always sets the account fields', async () => {
    const { run } = setup({ role: null });
    await expect(run({ serviceAccountId: null, isServerless: true })).resolves.toMatchObject({
      service_account_id: null,
      role_name: 'alertzero_threat_hunt',
      account_label: 'alertzero_threat_hunt',
      is_serverless: true,
    });
  });
});
