/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CausalFeature, SignalEntry, SignificantEvent } from '@kbn/significant-events-schema';
import { computeEventFacts, shouldSkipAsNoOp } from './event_facts';
import type { EventsWriteInput, SnapshotCandidate } from './types';

const TS_EARLIER = '2026-07-20T07:00:00.000Z';

const makeSignal = (
  impact: 'degraded' | 'blocked',
  ruleUuid = 'rule-abc'
): Extract<SignalEntry, { type: 'detection' }> => ({
  type: 'detection',
  stream_name: 'logs.checkout',
  description: 'High latency',
  verdict: 'confirms',
  impact,
  metadata: {
    detection_id: `det-${ruleUuid}`,
    rule_uuid: ruleUuid,
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
    causal_features: [],
    blast_radius: [],
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
  const skip = ({
    stored,
    submitted,
    mergedImpact,
  }: {
    stored: SignalEntry[];
    submitted: SignalEntry[];
    mergedImpact: 'degraded' | 'blocked';
  }) =>
    shouldSkipAsNoOp({
      latestEvent: makeStored(stored),
      candidate: makeCandidate(submitted),
      priorDocs: [],
      computedSeverity: 'high',
      mergedImpact,
    });

  it('skips a same-tier snapshot whose impact matches the stored event', () => {
    const signal = makeSignal('degraded');

    expect(skip({ stored: [signal], submitted: [signal], mergedImpact: 'degraded' })).toBe(true);
  });

  it('does not skip when the merged impact differs from the stored impact', () => {
    expect(
      skip({
        stored: [makeSignal('degraded')],
        submitted: [makeSignal('blocked')],
        mergedImpact: 'blocked',
      })
    ).toBe(false);
  });
});

describe('computeEventFacts — degraded', () => {
  const entity = (id: string): CausalFeature => ({
    feature_id: id,
    type: 'service',
    subtype: 'service',
    name: id,
    stream_name: 'logs.checkout',
  });

  it('stays medium however many topology entities the event lists', () => {
    const candidate = makeCandidate([makeSignal('degraded')]);

    const facts = computeEventFacts({
      candidate: {
        ...candidate,
        input: {
          ...candidate.input,
          causal_features: [entity('checkout'), entity('payments')],
          blast_radius: [
            { type: 'entity', feature_id: 'orders', name: 'orders', stream_name: 'logs.checkout' },
            {
              type: 'dependency',
              feature_id: 'orders-db',
              source: 'orders',
              target: 'checkout',
              stream_name: 'logs.checkout',
            },
          ],
        },
      },
      timestamp: '2026-07-20T08:00:00.000Z',
      latestByEventId: new Map(),
      priorDocsByEventId: new Map(),
      source: 'discovery',
    });

    expect(facts.severity).toBe('medium');
  });
});
