/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DetectionSignal } from '../../common/detection_signal';
import type { DetectionSignalStore, WriteSignalsResult } from '../lib/signals/signal_store';
import type { DetectionSignalReading } from '../lib/strategies/types';

/** A signal store in memory, for tests. It keeps what was written and can be told to reject a series. */
export class InMemorySignalStore implements DetectionSignalStore {
  public readonly written: DetectionSignal[] = [];

  constructor(private readonly rejectedFingerprints: string[] = []) {}

  public async write(signals: DetectionSignal[]): Promise<WriteSignalsResult> {
    const failures = signals
      .filter(({ data }) => this.rejectedFingerprints.includes(data.fingerprint))
      .map(({ data }) => ({ fingerprint: data.fingerprint, reason: 'rejected by the test' }));
    const accepted = signals.filter(
      ({ data }) => !this.rejectedFingerprints.includes(data.fingerprint)
    );
    this.written.push(...accepted);

    return { written: accepted.length, failures };
  }

  public async readHistory(): Promise<Map<string, DetectionSignalReading[]>> {
    return new Map();
  }
}
