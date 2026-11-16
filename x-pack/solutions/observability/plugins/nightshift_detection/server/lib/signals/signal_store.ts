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
  /** Writes the signals in one bulk call. A rejected signal is reported, not thrown. */
  write(signals: DetectionSignal[]): Promise<WriteSignalsResult>;

  /**
   * The readings of one strategy in one space for the given series, whose bucket starts in
   * `[from, to)` (epoch milliseconds), grouped by fingerprint, oldest first. Filtered on the
   * bucket start, never on `@timestamp`, because a reading is written after its bucket ends.
   */
  readHistory(params: {
    spaceId: string;
    strategy: string;
    fingerprints: string[];
    from: number;
    to: number;
  }): Promise<Map<string, DetectionSignalReading[]>>;
}

/** The engine's signal store. Bound to the fallback store until the `.rule-events` store exists. */
export const DetectionSignalStore = createToken<DetectionSignalStore>(
  'nightshiftDetection.DetectionSignalStore'
);
