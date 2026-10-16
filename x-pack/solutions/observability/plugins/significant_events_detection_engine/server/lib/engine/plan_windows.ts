/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DetectionStrategyId, EngineConfig, EngineProgress } from '../../../common';
import { BUCKET_MS, DETECTION_STRATEGY_IDS, MINUTE_MS } from '../../../common';
import { STRATEGIES } from '../strategies/strategy_registry';
import type { EngineLimits } from './engine_scope';

/** The buckets [from, to) one strategy evaluates in a run. */
export interface StrategyWindow {
  strategy: DetectionStrategyId;
  from: number;
  to: number;
  /** Minutes jumped over because the engine was further behind than it catches up. */
  skippedMinutes: number;
}

const floorToBucket = (time: number) => Math.floor(time / BUCKET_MS) * BUCKET_MS;

/**
 * Plans each strategy's window from where it got to. A strategy only evaluates buckets whose
 * data is complete (its settle delay has passed), at most `maxBucketsPerRun` of them, and when
 * it is more than `maxCatchUpMs` behind it jumps ahead: old buckets would only raise stale
 * events. A strategy that never ran starts at its latest settled bucket; replay seeds history.
 */
export function planWindows({
  now,
  config,
  progress,
  limits,
  only,
}: {
  now: number;
  config: EngineConfig;
  progress: EngineProgress;
  limits: EngineLimits;
  /** Backtests evaluate one bucket for every strategy, regardless of settle delays. */
  only?: { bucketEnd: number };
}): StrategyWindow[] {
  return DETECTION_STRATEGY_IDS.filter((strategy) => config.strategies[strategy].mode !== 'off')
    .map((strategy): StrategyWindow => {
      const { descriptor } = STRATEGIES[strategy];
      if (only) {
        return {
          strategy,
          from: only.bucketEnd - BUCKET_MS,
          to: only.bucketEnd,
          skippedMinutes: 0,
        };
      }
      const settledEnd = floorToBucket(now - descriptor.settleMs);
      const stored = progress.watermarks[strategy];
      const watermark = stored ? Date.parse(stored) : settledEnd - BUCKET_MS;
      // Strategies that read the present (active alerts) never evaluate the past.
      const earliest = descriptor.supportsReplay
        ? settledEnd - limits.maxCatchUpMs
        : settledEnd - BUCKET_MS;
      const from = Math.max(watermark, floorToBucket(earliest));
      const to = Math.min(settledEnd, from + limits.maxBucketsPerRun * BUCKET_MS);
      return {
        strategy,
        from,
        to: Math.max(from, to),
        skippedMinutes:
          descriptor.supportsReplay && from > watermark
            ? Math.round((from - watermark) / MINUTE_MS)
            : 0,
      };
    })
    .filter((window) => window.to > window.from);
}
