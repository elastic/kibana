/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { HuntScope } from '@kbn/alertzero-common';
import {
  readLastSweepIndexScope,
  readLatestFinishedSweepIndexScope,
  sweepEvaluatedUniverse,
} from './read_last_sweep_index_scope';

const scope = {
  status: 'blocked',
  resolution: 'blocked:empty_universe',
  index_patterns: [],
  missing: ['logs-*'],
  report_matches: [],
  actionable_indices: [],
  window: { from: '2026-01-01T00:00:00.000Z', to: '2026-01-31T00:00:00.000Z' },
  row_limit: 25,
};

const setup = (step: unknown) => {
  const management = {
    getStepExecution: jest.fn().mockResolvedValue(step),
  };
  const params = {
    management: management as never,
    workflowId: 'wf-1',
    executionId: 'exec-1',
    executionTime: 'executed-at',
    spaceId: 'default',
    request: httpServerMock.createKibanaRequest(),
    logger: loggingSystemMock.createLogger(),
  };
  return { management, params };
};

describe('readLastSweepIndexScope', () => {
  it('reads only the gate step of the execution', async () => {
    const { management, params } = setup(undefined);
    await readLastSweepIndexScope(params);
    expect(management.getStepExecution).toHaveBeenCalledWith(
      { workflowId: 'wf-1', workflowExecutionId: 'exec-1', stepId: 'check_index_scope' },
      'default',
      params.request
    );
  });

  it('returns the parsed scope and the step finish time', async () => {
    const { params } = setup({
      stepId: 'check_index_scope',
      startedAt: 's',
      finishedAt: 'f',
      output: scope,
    });
    await expect(readLastSweepIndexScope(params)).resolves.toEqual({
      checkedAt: 'f',
      executionId: 'exec-1',
      scope: expect.objectContaining({ resolution: 'blocked:empty_universe' }),
    });
  });

  it('falls back to the step start time when it has no finish time', async () => {
    const { params } = setup({ stepId: 'check_index_scope', startedAt: 's', output: scope });
    await expect(readLastSweepIndexScope(params)).resolves.toMatchObject({ checkedAt: 's' });
  });

  it('has no scope when the step has no output', async () => {
    const { params } = setup({ stepId: 'check_index_scope', startedAt: 's', finishedAt: 'f' });
    await expect(readLastSweepIndexScope(params)).resolves.toMatchObject({ scope: undefined });
  });

  it('has no scope, checked at the execution time, when the execution has no gate step', async () => {
    const { params } = setup(undefined);
    await expect(readLastSweepIndexScope(params)).resolves.toEqual({
      checkedAt: 'executed-at',
      executionId: 'exec-1',
      scope: undefined,
    });
  });

  it('returns undefined when the read throws', async () => {
    const { management, params } = setup(undefined);
    management.getStepExecution.mockRejectedValue(new Error('boom'));
    await expect(readLastSweepIndexScope(params)).resolves.toBeUndefined();
  });

  it('ignores a scope of the wrong shape and warns, instead of failing silently', async () => {
    const { params } = setup({
      stepId: 'check_index_scope',
      startedAt: 's',
      finishedAt: 'f',
      output: { ...scope, missing: 'custom-1' },
    });

    await expect(readLastSweepIndexScope(params)).resolves.toMatchObject({ scope: undefined });
    expect(params.logger.warn).toHaveBeenCalledTimes(1);
    expect(params.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('does not match the HuntScope schema and is ignored: missing')
    );
  });

  it('reads a scope from a long data view whole, so a blocked sweep still shows as blocked', async () => {
    const missing = [
      ...Array.from({ length: 600 }, (_value, index) => `custom-${index}`),
      'x'.repeat(600),
    ];
    const { params } = setup({
      stepId: 'check_index_scope',
      startedAt: 's',
      finishedAt: 'f',
      output: { ...scope, missing },
    });

    await expect(readLastSweepIndexScope(params)).resolves.toMatchObject({ scope: { missing } });
    expect(params.logger.warn).not.toHaveBeenCalled();
  });

  it('does not warn for a scope that parses', async () => {
    const { params } = setup({ stepId: 'check_index_scope', startedAt: 's', output: scope });

    await readLastSweepIndexScope(params);
    expect(params.logger.warn).not.toHaveBeenCalled();
  });
});

describe('readLatestFinishedSweepIndexScope', () => {
  const setupLatest = (latest: { id: string; finishedAt?: string } | undefined | Error) => {
    const management = {
      getLatestFinishedWorkflowExecution:
        latest instanceof Error
          ? jest.fn().mockRejectedValue(latest)
          : jest.fn().mockResolvedValue(latest),
      getStepExecution: jest.fn().mockResolvedValue({
        stepId: 'check_index_scope',
        startedAt: 's',
        finishedAt: 'f',
        output: scope,
      }),
    };
    const params = {
      management: management as never,
      workflowId: 'wf-1',
      spaceId: 'default',
      request: httpServerMock.createKibanaRequest(),
      logger: loggingSystemMock.createLogger(),
    };
    return { management, params };
  };

  it('reads the execution the finished-execution lookup names', async () => {
    const { management, params } = setupLatest({ id: 'exec-finished', finishedAt: 'b' });
    await expect(readLatestFinishedSweepIndexScope(params)).resolves.toMatchObject({
      executionId: 'exec-finished',
      checkedAt: 'f',
      scope: expect.objectContaining({ resolution: 'blocked:empty_universe' }),
    });
    expect(management.getLatestFinishedWorkflowExecution).toHaveBeenCalledWith(
      'wf-1',
      'default',
      params.request
    );
    expect(management.getStepExecution).toHaveBeenCalledWith(
      { workflowId: 'wf-1', workflowExecutionId: 'exec-finished', stepId: 'check_index_scope' },
      'default',
      params.request
    );
  });

  it('returns undefined without reading a step when none has finished', async () => {
    const { management, params } = setupLatest(undefined);
    await expect(readLatestFinishedSweepIndexScope(params)).resolves.toBeUndefined();
    expect(management.getStepExecution).not.toHaveBeenCalled();
  });

  it('returns undefined when the lookup throws', async () => {
    const { management, params } = setupLatest(new Error('boom'));
    await expect(readLatestFinishedSweepIndexScope(params)).resolves.toBeUndefined();
    expect(management.getStepExecution).not.toHaveBeenCalled();
  });
});

describe('sweepEvaluatedUniverse', () => {
  const blocked = scope as unknown as HuntScope;
  const ok = {
    ...scope,
    status: 'ok',
    index_patterns: ['logs-*', '-logs-x*'],
    missing: [],
  } as unknown as HuntScope;

  // The policy-only block: every entry was skipped, so both sides hold no positive pattern.
  it('matches an empty universe against a blocked scope that evaluated nothing', () => {
    expect(sweepEvaluatedUniverse({ ...blocked, missing: [], policy_skipped: ['.a-1'] }, [])).toBe(
      true
    );
    expect(sweepEvaluatedUniverse({ ...blocked, missing: [] }, ['-logs-x*'])).toBe(true);
  });

  it('compares a blocked sweep to what it reported missing', () => {
    expect(sweepEvaluatedUniverse(blocked, ['logs-*'])).toBe(true);
    expect(sweepEvaluatedUniverse(blocked, ['logs-*', 'extra-*'])).toBe(false);
  });

  it('counts a discovery_failed sweep as current, since it records no patterns', () => {
    const failed = { ...blocked, resolution: 'blocked:discovery_failed', missing: [] } as HuntScope;
    expect(sweepEvaluatedUniverse(failed, ['logs-*'])).toBe(true);
  });

  it('compares an unblocked sweep to its resolved patterns, ignoring exclusions', () => {
    expect(sweepEvaluatedUniverse(ok, ['logs-*', '-logs-y*'])).toBe(true);
    expect(sweepEvaluatedUniverse(ok, ['other-*'])).toBe(false);
  });

  describe('a sweep that dropped a name from the search', () => {
    const pruned = {
      ...scope,
      status: 'ok',
      resolution: 'universe',
      index_patterns: ['logs-*'],
      missing: ['custom-edr-1'],
    } as unknown as HuntScope;

    it('counts the dropped name as evaluated', () => {
      expect(sweepEvaluatedUniverse(pruned, ['logs-*', 'custom-edr-1'])).toBe(true);
    });

    it('does not match a universe missing one live pattern', () => {
      expect(sweepEvaluatedUniverse(pruned, ['logs-*', 'custom-edr-1', 'extra-*'])).toBe(false);
    });

    it('matches a universe with a duplicated entry', () => {
      expect(sweepEvaluatedUniverse(pruned, ['logs-*', 'logs-*', 'custom-edr-1'])).toBe(true);
    });

    it('does not match a pre-change unblocked scope with a dot-prefixed index pattern', () => {
      const dotted = {
        ...pruned,
        index_patterns: ['logs-*', '.alerts-x'],
        missing: [],
      } as HuntScope;
      expect(sweepEvaluatedUniverse(dotted, ['logs-*'])).toBe(false);
    });

    it('does not match a pre-change blocked scope with a dot-prefixed missing entry', () => {
      const dotted = { ...blocked, missing: ['.alerts-x'] } as HuntScope;
      expect(sweepEvaluatedUniverse(dotted, ['logs-*'])).toBe(false);
    });

    it('matches a pre-change unblocked scope without dot entries', () => {
      expect(sweepEvaluatedUniverse(ok, ['logs-*'])).toBe(true);
    });
  });
});
