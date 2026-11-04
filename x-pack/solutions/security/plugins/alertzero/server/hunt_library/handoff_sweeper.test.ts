/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { HANDOFF_STALE_AFTER_MS } from './handoff_cleanup';
import {
  HANDOFF_SWEEP_BUSY_INTERVAL_MS,
  HANDOFF_SWEEP_IDLE_INTERVAL_MS,
  runHandoffSweep,
} from './handoff_sweeper';

const NOW = new Date('2026-11-04T12:00:00.000Z');
const stale = new Date(NOW.getTime() - HANDOFF_STALE_AFTER_MS - 1000).toISOString();
const fresh = NOW.toISOString();

interface Execution {
  id: string;
  labels: Record<string, string>;
}

const setup = (bySpace: Record<string, Record<string, Execution[]>>) => {
  const state = JSON.parse(JSON.stringify(bySpace)) as typeof bySpace;
  const updates: Array<{ executionId: string; spaceId: string; labels: Record<string, string> }> =
    [];
  const management = {
    findExecutionsByLabel: jest.fn(
      async ({ spaceId, value }: { spaceId: string; value: string }) => {
        if (state[spaceId] === undefined) throw new Error(`cannot read ${spaceId}`);
        return state[spaceId][value] ?? [];
      }
    ),
    updateExecutionLabels: jest.fn(
      async ({
        executionId,
        spaceId,
        labels,
      }: {
        executionId: string;
        spaceId: string;
        labels: Record<string, string>;
      }) => {
        updates.push({ executionId, spaceId, labels });
        // Flagging moves the execution between outcomes, as the real label write does.
        const pending = state[spaceId].pending_handoff ?? [];
        const moved = pending.find(({ id }) => id === executionId);
        state[spaceId].pending_handoff = pending.filter(({ id }) => id !== executionId);
        if (moved) {
          state[spaceId].handoff_cleanup_required = [
            ...(state[spaceId].handoff_cleanup_required ?? []),
            { ...moved, labels: { ...moved.labels, ...labels } },
          ];
        }
        return labels;
      }
    ),
  };
  const logger = loggingSystemMock.createLogger();
  const run = (spaces = Object.keys(bySpace)) =>
    runHandoffSweep({
      listSpaceIds: async () => spaces,
      management: management as never,
      logger,
      now: () => NOW,
    });
  return { run, updates, management, logger };
};

describe('runHandoffSweep', () => {
  it('is idle, and checks again in 5 minutes, when nothing is stuck', async () => {
    const { run, updates } = setup({ default: {} });

    await expect(run()).resolves.toEqual({
      flagged: 0,
      cleanupRequired: 0,
      exhausted: 0,
      nextRunInMs: HANDOFF_SWEEP_IDLE_INTERVAL_MS,
    });
    expect(updates).toEqual([]);
  });

  it('flags an abandoned pending handoff for cleanup and checks again in a minute', async () => {
    const { run, updates } = setup({
      default: {
        pending_handoff: [
          {
            id: 'e1',
            labels: {
              'hunt.outcome': 'pending_handoff',
              'hunt.last_handoff_at': stale,
              'hunt.preservation_id': 'p1',
            },
          },
        ],
      },
    });

    const result = await run();

    expect(result).toMatchObject({
      flagged: 1,
      cleanupRequired: 1,
      nextRunInMs: HANDOFF_SWEEP_BUSY_INTERVAL_MS,
    });
    expect(updates).toEqual([
      {
        executionId: 'e1',
        spaceId: 'default',
        labels: { 'hunt.outcome': 'handoff_cleanup_required', 'hunt.cleanup_operation_id': 'p1' },
      },
    ]);
  });

  it('leaves a fresh pending handoff alone but keeps sweeping every minute', async () => {
    const { run, updates } = setup({
      default: {
        pending_handoff: [
          {
            id: 'e1',
            labels: { 'hunt.outcome': 'pending_handoff', 'hunt.last_handoff_at': fresh },
          },
        ],
      },
    });

    const result = await run();

    expect(result).toMatchObject({ flagged: 0, nextRunInMs: HANDOFF_SWEEP_BUSY_INTERVAL_MS });
    expect(updates).toEqual([]);
  });

  it('counts sessions awaiting cleanup and sessions that need an operator, and says so', async () => {
    const { run, logger } = setup({
      default: {
        handoff_cleanup_required: [{ id: 'e1', labels: {} }],
        handoff_cleanup_exhausted: [
          { id: 'e2', labels: {} },
          { id: 'e3', labels: {} },
        ],
      },
    });

    const result = await run();

    expect(result).toMatchObject({
      cleanupRequired: 1,
      exhausted: 2,
      nextRunInMs: HANDOFF_SWEEP_BUSY_INTERVAL_MS,
    });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('2 Hunt session(s)'));
  });

  it('reads every space, with no user request', async () => {
    const { run, management } = setup({
      default: {},
      sec: {
        handoff_cleanup_required: [{ id: 'e1', labels: {} }],
      },
    });

    const result = await run();

    expect(result.cleanupRequired).toBe(1);
    expect(management.findExecutionsByLabel).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'sec', request: undefined })
    );
  });

  it('skips a space it cannot read, logs it, and still sweeps the rest', async () => {
    const { run, logger } = setup({
      sec: { handoff_cleanup_required: [{ id: 'e1', labels: {} }] },
    });

    const result = await run(['broken', 'sec']);

    expect(result.cleanupRequired).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('could not read space broken')
    );
  });
});
