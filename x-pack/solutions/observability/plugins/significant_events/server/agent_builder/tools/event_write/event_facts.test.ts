/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CausalFeature,
  Severity,
  SignalEntry,
  SignificantEvent,
} from '@kbn/significant-events-schema';
import { computeEventFacts, shouldSkipAsNoOp } from './event_facts';
import type { EventsWriteInput, SnapshotCandidate } from './types';

const TS_EARLIER = '2026-07-20T07:00:00.000Z';
const TS_NOW = '2026-07-20T08:00:00.000Z';

const makeSignal = ({
  ruleUuid = 'rule-abc',
  verdict = 'confirms',
}: {
  ruleUuid?: string;
  verdict?: SignalEntry['verdict'];
} = {}): Extract<SignalEntry, { type: 'detection' }> => ({
  type: 'detection',
  stream_name: 'logs.checkout',
  description: 'High latency',
  verdict,
  metadata: {
    detection_id: `det-${ruleUuid}`,
    rule_uuid: ruleUuid,
    change_point_type: 'spike',
    p_value: 0.01,
  },
});

const makeStored = (
  signals: SignalEntry[],
  overrides: Partial<SignificantEvent> = {}
): SignificantEvent =>
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
    ...overrides,
  } as SignificantEvent);

const makeCandidate = (
  signals: SignalEntry[],
  overrides: Partial<EventsWriteInput> = {}
): SnapshotCandidate => ({
  mode: 'snapshot',
  index: 0,
  eventId: 'checkout-stable',
  input: {
    event_id: 'checkout-stable',
    status: 'active',
    stream_names: ['logs.checkout'],
    title: 'Checkout latency',
    symptom_hypothesis: 'Checkout requests are delayed.',
    summary: 'P99 latency breached SLO',
    severity: 'high',
    confidence: 0.8,
    assessment_note: 'Verified via execute_esql',
    signals,
    causal_features: [],
    blast_radius: [],
    ...overrides,
  } satisfies EventsWriteInput,
});

describe('shouldSkipAsNoOp', () => {
  const skip = ({
    stored,
    submitted,
    severity = 'high',
    storedSeverity = 'high',
    status = 'active',
  }: {
    stored: SignalEntry[];
    submitted: SignalEntry[];
    severity?: Severity;
    storedSeverity?: Severity;
    status?: 'active' | 'inactive';
  }) =>
    shouldSkipAsNoOp({
      latestEvent: makeStored(stored, { severity: storedSeverity }),
      candidate: makeCandidate(submitted, { status }),
      priorDocs: [],
      severity,
    });

  it('skips a snapshot with the same severity, status and rules', () => {
    const signal = makeSignal();

    expect(skip({ stored: [signal], submitted: [signal] })).toBe(true);
  });

  it('does not skip when the severity this write would store differs', () => {
    const signal = makeSignal();

    expect(skip({ stored: [signal], submitted: [signal], severity: 'critical' })).toBe(false);
  });

  it('does not skip when the status changes', () => {
    const signal = makeSignal();

    expect(skip({ stored: [signal], submitted: [signal], status: 'inactive' })).toBe(false);
  });

  it('does not skip when the candidate adds a new rule', () => {
    expect(
      skip({
        stored: [makeSignal({ ruleUuid: 'rule-1' })],
        submitted: [makeSignal({ ruleUuid: 'rule-2' })],
      })
    ).toBe(false);
  });

  it('never skips when there is no stored version', () => {
    expect(
      shouldSkipAsNoOp({
        latestEvent: undefined,
        candidate: makeCandidate([makeSignal()]),
        priorDocs: [],
        severity: 'high',
      })
    ).toBe(false);
  });
});

describe('computeEventFacts', () => {
  const facts = ({
    signals,
    candidateOverrides,
    stored,
    source,
  }: {
    signals: SignalEntry[];
    candidateOverrides?: Partial<EventsWriteInput>;
    stored?: SignificantEvent;
    source?: 'discovery';
  }) => {
    const candidate = makeCandidate(signals, candidateOverrides);

    return computeEventFacts({
      candidate,
      timestamp: TS_NOW,
      latestByEventId: new Map(stored ? [[candidate.eventId, stored]] : []),
      priorDocsByEventId: new Map(stored ? [[candidate.eventId, [stored]]] : []),
      source,
    });
  };

  it('stores the agent’s proposal as given', () => {
    for (const severity of ['critical', 'high', 'medium', 'low'] as const) {
      expect(facts({ signals: [makeSignal()], candidateOverrides: { severity } }).severity).toBe(
        severity
      );
    }
  });

  it('floors an inactive event to low', () => {
    expect(
      facts({
        signals: [makeSignal()],
        candidateOverrides: { status: 'inactive', severity: 'high' },
      }).severity
    ).toBe('low');
  });

  it('judges the merged member-union of stored and submitted signals', () => {
    const stored = makeStored([makeSignal({ ruleUuid: 'rule-1' })], { severity: 'high' });

    const result = facts({
      signals: [makeSignal({ ruleUuid: 'rule-2' })],
      candidateOverrides: { severity: 'critical' },
      stored,
    });

    expect(result.severity).toBe('critical');
    expect(result.signals).toHaveLength(2);
  });

  it('keeps an explicit severity on a signal-less write, and defaults it to low', () => {
    expect(facts({ signals: [], candidateOverrides: { severity: 'critical' } }).severity).toBe(
      'critical'
    );
    expect(facts({ signals: [], candidateOverrides: { severity: undefined } }).severity).toBe(
      'low'
    );
  });

  it('refuses signals without a proposed severity rather than guessing one', () => {
    expect(() =>
      facts({ signals: [makeSignal()], candidateOverrides: { severity: undefined } })
    ).toThrow('needs a proposed severity');
  });

  it('is unchanged however many topology entities the event lists', () => {
    const entity = (id: string): CausalFeature => ({
      feature_id: id,
      type: 'service',
      subtype: 'service',
      name: id,
      stream_name: 'logs.checkout',
    });

    const result = facts({
      signals: [makeSignal()],
      candidateOverrides: {
        severity: 'medium',
        causal_features: [entity('checkout'), entity('payments')],
      },
    });

    expect(result.severity).toBe('medium');
  });

  describe('investigation lock', () => {
    const investigated = (signals: SignalEntry[]) =>
      makeStored(signals, {
        severity: 'medium',
        investigations: [
          { workflow_execution_id: 'wf-1', started_at: TS_EARLIER, completed_at: TS_EARLIER },
        ],
      });

    it('keeps the stored tier of a completed investigation over the proposal', () => {
      const signal = makeSignal();

      const result = facts({
        signals: [signal],
        candidateOverrides: { severity: 'high' },
        stored: investigated([signal]),
        source: 'discovery',
      });

      expect(result.severity).toBe('medium');
    });
  });
});
