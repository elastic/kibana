/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalEntry, SignificantEvent } from '@kbn/significant-events-schema';
import { shouldSkipAsNoOp } from './event_facts';
import type { EventsWriteInput, SnapshotCandidate } from './types';

const TS_EARLIER = '2026-07-20T07:00:00.000Z';

const makeSignal = (
  effect: 'degradation' | 'outage',
  outagePaths: string[] = []
): Extract<SignalEntry, { type: 'detection' }> => ({
  type: 'detection',
  stream_name: 'logs.checkout',
  description: 'High latency',
  verdict: 'confirms',
  effect,
  ...(outagePaths.length > 0 ? { outage_paths: outagePaths } : {}),
  metadata: {
    detection_id: 'det-rule-abc',
    rule_uuid: 'rule-abc',
    change_point_type: 'spike',
    p_value: 0.01,
  },
});

const makeStored = (signals: SignalEntry[]): SignificantEvent =>
  ({
    '@timestamp': TS_EARLIER,
    event_id: 'checkout-stable',
    status: 'active',
    severity: 'high',
    stream_names: ['logs.checkout'],
    signals,
    title: 'Checkout latency',
    symptom_hypothesis: 'Checkout requests are delayed.',
    summary: 'P99 latency breached SLO',
    confidence: 0.8,
  } as SignificantEvent);

const makeCandidate = (signals: SignalEntry[]): SnapshotCandidate => ({
  mode: 'snapshot',
  index: 0,
  eventId: 'checkout-stable',
  input: {
    status: 'active',
    stream_names: ['logs.checkout'],
    title: 'Checkout latency',
    symptom_hypothesis: 'Checkout requests are delayed.',
    summary: 'P99 latency breached SLO',
    confidence: 0.8,
    assessment_note: 'Verified via execute_esql',
    signals,
    causal_features: [],
    blast_radius: [],
  } satisfies EventsWriteInput,
});

describe('shouldSkipAsNoOp', () => {
  it('skips a same-tier snapshot whose effect and outage paths match the stored event', () => {
    const signal = makeSignal('degradation');
    expect(
      shouldSkipAsNoOp({
        latestEvent: makeStored([signal]),
        candidate: makeCandidate([signal]),
        priorDocs: [],
        computedSeverity: 'high',
        mergedSignals: [signal],
      })
    ).toBe(true);
  });

  it('does not skip when the merged effect differs from the stored effect', () => {
    const stored = makeSignal('degradation');
    const changed = makeSignal('outage', ['orders-api -> postgres']);
    expect(
      shouldSkipAsNoOp({
        latestEvent: makeStored([stored]),
        candidate: makeCandidate([changed]),
        priorDocs: [],
        computedSeverity: 'high',
        mergedSignals: [changed],
      })
    ).toBe(false);
  });

  it('does not skip when the outage paths differ from the stored paths', () => {
    const stored = makeSignal('outage', ['orders-api -> postgres']);
    const changed = makeSignal('outage', ['checkout']);
    expect(
      shouldSkipAsNoOp({
        latestEvent: makeStored([stored]),
        candidate: makeCandidate([changed]),
        priorDocs: [],
        computedSeverity: 'high',
        mergedSignals: [changed],
      })
    ).toBe(false);
  });
});
