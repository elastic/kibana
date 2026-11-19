/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InvalidStrategyScheduleError } from '../errors/invalid_strategy_schedule_error';
import type { DetectionStrategy } from '../strategies/detection_strategy';

const MINUTE_MS = 60_000;

/** Most minutes one run processes per strategy (a longer cadence processes one cadence). */
export const MAX_MINUTES_PER_RUN = 10;

/**
 * A strategy more than this many minutes behind jumps ahead instead of replaying the backlog:
 * old minutes would only raise stale events.
 */
export const MAX_CATCH_UP_MINUTES = 120;

/** The window one strategy processes in a run: `[from, to)` in epoch milliseconds. */
export interface PlannedWindow {
  strategy: DetectionStrategy;
  from: number;
  to: number;
  /** Minutes jumped over because the strategy was too far behind, or the backlog was skipped. */
  skipped_minutes: number;
}

const alignDown = ({ time, stepMs }: { time: number; stepMs: number }) =>
  Math.floor(time / stepMs) * stepMs;
const alignUp = ({ time, stepMs }: { time: number; stepMs: number }) =>
  Math.ceil(time / stepMs) * stepMs;

function planWindow({
  strategy,
  processedUntil,
  now,
  skipBacklog,
}: {
  strategy: DetectionStrategy;
  processedUntil: number | undefined;
  now: number;
  skipBacklog: boolean;
}): PlannedWindow | undefined {
  const { id, cadence_minutes: cadence, settle_minutes: settle } = strategy.descriptor;

  // A zero cadence divides by zero and a fractional one breaks the whole-minute windows; either
  // would plan a window of `NaN` and save it as the strategy's progress.
  if (!Number.isInteger(cadence) || cadence < 1 || !Number.isInteger(settle) || settle < 0) {
    throw new InvalidStrategyScheduleError(id);
  }

  const cadenceMs = cadence * MINUTE_MS;
  const maxRunMs = Math.max(MAX_MINUTES_PER_RUN, cadence) * MINUTE_MS;

  // Only buckets whose data has settled are read, and only whole cadence steps.
  const settledEnd = alignDown({ time: now - settle * MINUTE_MS, stepMs: cadenceMs });

  if (processedUntil !== undefined && settledEnd - processedUntil < cadenceMs) {
    return undefined;
  }

  // A strategy that never ran starts about one run's worth back, so its first window has data to
  // read. Aligned up, so the window opens on a cadence boundary and has no partial first bucket.
  const start = processedUntil ?? alignUp({ time: settledEnd - maxRunMs, stepMs: cadenceMs });
  // The oldest minute a run may start at: the catch-up limit, or the latest cadence step when the
  // backlog is skipped. The limit never leaves less than one cadence step to run.
  const latestStep = settledEnd - cadenceMs;
  const earliest = skipBacklog
    ? latestStep
    : Math.min(
        alignUp({ time: settledEnd - MAX_CATCH_UP_MINUTES * MINUTE_MS, stepMs: cadenceMs }),
        latestStep
      );
  const from = Math.max(start, earliest);
  const to = alignDown({ time: Math.min(settledEnd, from + maxRunMs), stepMs: cadenceMs });

  if (to <= from) {
    return undefined;
  }

  return {
    strategy,
    from,
    to,
    skipped_minutes:
      processedUntil !== undefined && from > processedUntil
        ? Math.round((from - processedUntil) / MINUTE_MS)
        : 0,
  };
}

/**
 * Plans the window of every strategy that is due. A strategy is due when a whole cadence step has
 * settled since its last processed minute; its window starts there and covers at most one run's
 * worth of minutes. A strategy that never ran starts one run back; one too far behind jumps to
 * `MAX_CATCH_UP_MINUTES` back, or with `skipBacklog` to its latest settled cadence step.
 *
 * Throws `InvalidStrategyScheduleError` for a strategy whose cadence or settle time is not a whole
 * number of minutes in range.
 */
export function planWindows({
  strategies,
  processedUntil,
  now,
  skipBacklog = false,
}: {
  strategies: DetectionStrategy[];
  /** Last processed minute per strategy id; a strategy that never ran is absent. */
  processedUntil: Map<string, number>;
  now: number;
  skipBacklog?: boolean;
}): PlannedWindow[] {
  return strategies.flatMap((strategy) => {
    const window = planWindow({
      strategy,
      processedUntil: processedUntil.get(strategy.descriptor.id),
      now,
      skipBacklog,
    });

    return window ? [window] : [];
  });
}
