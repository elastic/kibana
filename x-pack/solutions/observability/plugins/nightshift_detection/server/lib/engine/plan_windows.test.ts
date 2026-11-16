/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestStrategy } from '../../test_utils/test_strategy';
import type { DetectionStrategy } from '../strategies/detection_strategy';
import { MAX_CATCH_UP_MINUTES, MAX_MINUTES_PER_RUN, planWindows } from './plan_windows';

const MINUTE_MS = 60_000;
// A minute that is also a five-minute boundary, plus some seconds into the next minute.
const SETTLED_END = Date.UTC(2026, 10, 13, 10, 0);
const NOW = SETTLED_END + 20_000;

function createStrategy({ id, cadence }: { id: string; cadence: number }): DetectionStrategy {
  const strategy = createTestStrategy();

  return {
    ...strategy,
    descriptor: { ...strategy.descriptor, id, cadence_minutes: cadence, settle_minutes: 0 },
  };
}

const EVERY_MINUTE = createStrategy({ id: 'every_minute', cadence: 1 });
const EVERY_FIVE_MINUTES = createStrategy({ id: 'every_five_minutes', cadence: 5 });

function plan({
  strategies = [EVERY_MINUTE],
  watermarks = {},
  now = NOW,
  skipBacklog,
}: {
  strategies?: DetectionStrategy[];
  watermarks?: Record<string, number>;
  now?: number;
  skipBacklog?: boolean;
}) {
  return planWindows({
    strategies,
    watermarks: new Map(Object.entries(watermarks)),
    now,
    skipBacklog,
  }).map(({ strategy, from, to, skipped_minutes: skipped }) => ({
    id: strategy.descriptor.id,
    from: (from - SETTLED_END) / MINUTE_MS,
    to: (to - SETTLED_END) / MINUTE_MS,
    skipped,
  }));
}

describe('planWindows', () => {
  it('starts a strategy that never ran one run back', () => {
    expect(plan({})).toEqual([
      { id: 'every_minute', from: -MAX_MINUTES_PER_RUN, to: 0, skipped: 0 },
    ]);
  });

  it('runs a one-minute strategy every minute and a five-minute one every fifth', () => {
    const strategies = [EVERY_MINUTE, EVERY_FIVE_MINUTES];
    const watermarks: Record<string, number> = {
      every_minute: SETTLED_END,
      every_five_minutes: SETTLED_END,
    };
    const windows: ReturnType<typeof plan> = [];

    // Imperative on purpose: each tick's watermarks come from the previous tick's windows.
    for (let minute = 1; minute <= 10; minute++) {
      const now = SETTLED_END + minute * MINUTE_MS + 20_000;
      planWindows({ strategies, watermarks: new Map(Object.entries(watermarks)), now }).forEach(
        ({ strategy, from, to }) => {
          windows.push({
            id: strategy.descriptor.id,
            from: (from - SETTLED_END) / MINUTE_MS,
            to: (to - SETTLED_END) / MINUTE_MS,
            skipped: 0,
          });
          watermarks[strategy.descriptor.id] = to;
        }
      );
    }

    expect(windows.filter(({ id }) => id === 'every_minute').map(({ from }) => from)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
    expect(windows.filter(({ id }) => id === 'every_five_minutes')).toEqual([
      { id: 'every_five_minutes', from: 0, to: 5, skipped: 0 },
      { id: 'every_five_minutes', from: 5, to: 10, skipped: 0 },
    ]);
  });

  it('covers a five-minute gap in one run', () => {
    expect(plan({ watermarks: { every_minute: SETTLED_END - 5 * MINUTE_MS } })).toEqual([
      { id: 'every_minute', from: -5, to: 0, skipped: 0 },
    ]);
  });

  it('catches up a gap between ten and 120 minutes over several runs', () => {
    const watermarks = { every_minute: SETTLED_END - 20 * MINUTE_MS };
    const [first] = plan({ watermarks });

    expect(first).toEqual({ id: 'every_minute', from: -20, to: -10, skipped: 0 });

    const [second] = plan({
      watermarks: { every_minute: SETTLED_END + first.to * MINUTE_MS },
    });

    expect(second).toEqual({ id: 'every_minute', from: -10, to: 0, skipped: 0 });
  });

  it('jumps ahead and reports the skipped minutes when more than 120 minutes behind', () => {
    const behind = MAX_CATCH_UP_MINUTES + 30;

    expect(plan({ watermarks: { every_minute: SETTLED_END - behind * MINUTE_MS } })).toEqual([
      {
        id: 'every_minute',
        from: -MAX_CATCH_UP_MINUTES,
        to: -110,
        skipped: 30,
      },
    ]);
  });

  it('starts at the latest settled cadence step when the backlog is skipped', () => {
    expect(
      plan({
        strategies: [EVERY_FIVE_MINUTES],
        watermarks: { every_five_minutes: SETTLED_END - 50 * MINUTE_MS },
        skipBacklog: true,
      })
    ).toEqual([{ id: 'every_five_minutes', from: -5, to: 0, skipped: 45 }]);
  });

  it('plans a strategy added later from its first-run window while others continue', () => {
    expect(
      plan({
        strategies: [EVERY_MINUTE, EVERY_FIVE_MINUTES],
        watermarks: { every_minute: SETTLED_END - MINUTE_MS },
      })
    ).toEqual([
      { id: 'every_minute', from: -1, to: 0, skipped: 0 },
      { id: 'every_five_minutes', from: -MAX_MINUTES_PER_RUN, to: 0, skipped: 0 },
    ]);
  });
});
