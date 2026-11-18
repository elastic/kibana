/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createToken } from '@kbn/core-di';
import type { DetectionSignal } from '../../../common/detection_signal';
import type { DetectionSignalReading } from '../strategies/types';

/** The result of writing a batch of signals. */
export interface WriteSignalsResult {
  written: number;
  /** Signals the store rejected, so the run can report them. */
  failures: Array<{ fingerprint: string; reason: string }>;
}

/** Where detection signals are kept. */
export interface DetectionSignalStore {
  /**
   * Writes the signals. A rejected signal is reported, not thrown. A write has no document id, so
   * a window written again, after a crash, stores its signals again; readers must count a reading
   * once per series and bucket start, as `readHistory` does.
   */
  write(signals: DetectionSignal[]): Promise<WriteSignalsResult>;

  /**
   * The readings of one strategy at one version in one space for the given series, whose bucket
   * starts in `[from, to)` (epoch milliseconds), grouped by fingerprint, oldest first. Readings of
   * another version are left out: a version is bumped when what a reading means changes, so they
   * are not a baseline. Filtered on the bucket start, never on `@timestamp`, because a reading is
   * written after its bucket ends. A reading stored twice is returned once.
   * When more than a read can return match, the newest are kept.
   */
  readHistory(params: {
    spaceId: string;
    strategy: string;
    strategyVersion: number;
    fingerprints: string[];
    from: number;
    to: number;
    /** Stops the search when the run is out of time or cancelled. */
    abortSignal?: AbortSignal;
  }): Promise<Map<string, DetectionSignalReading[]>>;
}

/** The engine's signal store, backed by `.rule-events`. */
export const DetectionSignalStore = createToken<DetectionSignalStore>(
  'nightshiftDetection.DetectionSignalStore'
);
