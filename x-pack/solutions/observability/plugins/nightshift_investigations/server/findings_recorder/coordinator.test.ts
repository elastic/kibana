/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FindingsCoordinator } from './coordinator';

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe('FindingsCoordinator', () => {
  const execution = () => new AbortController();

  it("remembers the recorder's answers per investigation, oldest first", () => {
    const coordinator = new FindingsCoordinator();
    const turn = (n: number) => ({ atGroups: n, final: false, answer: { n } });

    coordinator.memory('a').remember(turn(1));
    coordinator.memory('a').remember(turn(2));
    coordinator.memory('b').remember(turn(9));

    expect(coordinator.memory('a').turns()).toEqual([turn(1), turn(2)]);
    expect(coordinator.memory('b').turns()).toEqual([turn(9)]);
  });

  it('forgets an investigation once its final pass is done', async () => {
    const coordinator = new FindingsCoordinator();
    coordinator.memory('a').remember({ atGroups: 1, final: false, answer: {} });

    await coordinator.runFinal({
      conversationId: 'a',
      timeoutMs: 1000,
      run: async () => undefined,
    });

    expect(coordinator.memory('a').turns()).toEqual([]);
  });

  it('runs one live pass at a time per investigation', async () => {
    const coordinator = new FindingsCoordinator();
    const gate = deferred();
    const run = jest.fn(() => gate.promise);
    const start = () =>
      coordinator.startLive({
        conversationId: 'c1',
        executionSignal: execution().signal,
        timeoutMs: 1000,
        run,
      });

    expect(start()).toBe(true);
    expect(start()).toBe(false);
    expect(run).toHaveBeenCalledTimes(1);

    gate.resolve();
    await gate.promise;
    await Promise.resolve();
    await Promise.resolve();
    expect(start()).toBe(true);
  });

  it('lets different investigations run live passes at once', () => {
    const coordinator = new FindingsCoordinator();
    const start = (conversationId: string) =>
      coordinator.startLive({
        conversationId,
        executionSignal: execution().signal,
        timeoutMs: 1000,
        run: () => new Promise(() => undefined),
      });

    expect(start('a')).toBe(true);
    expect(start('b')).toBe(true);
  });

  it('stops a live pass when the final pass takes over, so the stale write is dropped', async () => {
    const coordinator = new FindingsCoordinator();
    const gate = deferred();
    const order: string[] = [];
    let staleWrote: boolean | undefined;

    coordinator.startLive({
      conversationId: 'c1',
      executionSignal: execution().signal,
      timeoutMs: 1000,
      run: async (guard) => {
        await gate.promise;
        staleWrote = guard.claimWrite();
        order.push('live settled');
      },
    });

    const final = coordinator.runFinal({
      conversationId: 'c1',
      timeoutMs: 1000,
      run: async (guard) => {
        order.push('final started');
        return guard.claimWrite();
      },
    });
    gate.resolve();

    await expect(final).resolves.toBe(true);
    expect(staleWrote).toBe(false);
    expect(order).toEqual(['live settled', 'final started']);
  });

  it('drops a write from an older ticket once a newer pass has written', async () => {
    const coordinator = new FindingsCoordinator();
    const claims: boolean[] = [];

    await coordinator.runFinal({
      conversationId: 'c1',
      timeoutMs: 1000,
      run: async (guard) => {
        claims.push(guard.claimWrite());
        claims.push(guard.claimWrite());
      },
    });

    expect(claims).toEqual([true, true]);
  });

  it('refuses new live passes after the final pass took over, until it is released', async () => {
    const coordinator = new FindingsCoordinator();
    const final = coordinator.runFinal({
      conversationId: 'c1',
      timeoutMs: 1000,
      run: async () => {
        return coordinator.startLive({
          conversationId: 'c1',
          executionSignal: execution().signal,
          timeoutMs: 1000,
          run: async () => undefined,
        });
      },
    });

    await expect(final).resolves.toBe(false);
  });

  it('lets the final pass record its fallback after its own timeout, but not a stale live pass', async () => {
    jest.useFakeTimers();
    try {
      const coordinator = new FindingsCoordinator();
      let finalClaim: boolean | undefined;
      const final = coordinator.runFinal({
        conversationId: 'c1',
        timeoutMs: 100,
        run: async (guard) => {
          jest.advanceTimersByTime(101);
          expect(guard.signal.aborted).toBe(true);
          finalClaim = guard.claimWrite();
        },
      });
      await final;
      expect(finalClaim).toBe(true);

      const exec = new AbortController();
      let liveClaim: boolean | undefined;
      coordinator.startLive({
        conversationId: 'c2',
        executionSignal: exec.signal,
        timeoutMs: 100,
        run: async (guard) => {
          jest.advanceTimersByTime(101);
          liveClaim = guard.claimWrite();
        },
      });
      await Promise.resolve();
      await Promise.resolve();
      expect(liveClaim).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  it('aborts a live pass with its execution and after its timeout', async () => {
    jest.useFakeTimers();
    try {
      const coordinator = new FindingsCoordinator();
      const signals: AbortSignal[] = [];
      const exec = execution();
      coordinator.startLive({
        conversationId: 'c1',
        executionSignal: exec.signal,
        timeoutMs: 500,
        run: (guard) => {
          signals.push(guard.signal);
          return new Promise(() => undefined);
        },
      });

      jest.advanceTimersByTime(501);
      expect(signals[0].aborted).toBe(true);

      const second = new FindingsCoordinator();
      const exec2 = execution();
      second.startLive({
        conversationId: 'c2',
        executionSignal: exec2.signal,
        timeoutMs: 10_000,
        run: (guard) => {
          signals.push(guard.signal);
          return new Promise(() => undefined);
        },
      });
      exec2.abort();
      expect(signals[1].aborted).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});
