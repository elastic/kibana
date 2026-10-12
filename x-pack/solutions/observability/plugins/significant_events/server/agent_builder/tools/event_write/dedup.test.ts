/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalEntry, SignificantEvent } from '@kbn/significant-events-schema';
import {
  buildWriteCandidates,
  fetchActiveEventsForDedup,
  markDuplicateKeys,
  resolveDedupSkips,
} from './dedup';
import type { RuleEventsClient } from '../../../lib/significant_events/events/rule_events_client';
import type { BulkResults, DedupCandidate, EventsWriteInput } from './types';

type DetectionSignal = Extract<SignalEntry, { type: 'detection' }>;
type ChangePointType = DetectionSignal['metadata']['change_point_type'];

const makeSignal = (
  ruleUuid: string,
  verdict: DetectionSignal['verdict'] = 'confirms',
  changePointType: ChangePointType | undefined = 'spike'
): DetectionSignal => {
  const { change_point_type: _omit, ...metadata } = {
    detection_id: `det-${ruleUuid}`,
    rule_uuid: ruleUuid,
    rule_name: ruleUuid,
    change_point_type: changePointType,
    p_value: 0.01,
  };
  return {
    type: 'detection',
    stream_name: 'logs.checkout',
    description: 'High Latency',
    verdict,
    metadata:
      changePointType === undefined
        ? (metadata as DetectionSignal['metadata'])
        : { ...metadata, change_point_type: changePointType },
  };
};

const makeInput = (overrides: Partial<EventsWriteInput> = {}): EventsWriteInput => ({
  status: 'active',
  stream_names: ['logs.checkout'],
  title: 'Checkout latency',
  symptom_hypothesis: 'Checkout requests are delayed.',
  summary: 'P99 latency breached SLO',
  confidence: 0.82,
  assessment_note: 'Verified via execute_esql',
  causal_features: [],
  blast_radius: [],
  signals: [makeSignal('rule-abc')],
  ...overrides,
});

const makeActiveEvent = (overrides: Partial<SignificantEvent> = {}): SignificantEvent =>
  ({
    '@timestamp': new Date().toISOString(),
    event_id: 'existing-event-id',
    status: 'active',
    severity: 'high',
    stream_names: ['logs.checkout'],
    signals: [makeSignal('rule-abc')],
    title: 'Test event',
    symptom_hypothesis: 'Test hypothesis',
    summary: 'Test summary',
    confidence: 0.8,
    ...overrides,
  } as SignificantEvent);

const makeClient = (
  hits: SignificantEvent[] = []
): jest.Mocked<Pick<RuleEventsClient, 'findLatestActive'>> & RuleEventsClient =>
  ({ findLatestActive: jest.fn().mockResolvedValue({ hits }) } as never);

const dedupCandidates = (inputs: EventsWriteInput[]): DedupCandidate[] =>
  buildWriteCandidates(inputs).filter((c): c is DedupCandidate => c.mode === 'dedup');

const resolve = (inputs: EventsWriteInput[], activeEvents: SignificantEvent[]) => {
  const results: BulkResults = new Array(inputs.length);
  const toWrite = resolveDedupSkips(buildWriteCandidates(inputs), activeEvents, results);
  return { results, toWrite };
};

const flag = (inputs: EventsWriteInput[]) => {
  const results: BulkResults = new Array(inputs.length);
  const remaining = markDuplicateKeys(buildWriteCandidates(inputs), results);
  return { results, remaining };
};

describe('buildWriteCandidates', () => {
  it('uses snapshot mode for an item with an event_id', () => {
    const [candidate] = buildWriteCandidates([makeInput({ event_id: 'event-1' })]);

    expect(candidate).toMatchObject({ mode: 'snapshot', index: 0, eventId: 'event-1' });
  });

  it('treats an empty event_id as absent and generates one', () => {
    const [candidate] = buildWriteCandidates([makeInput({ event_id: '' })]);

    expect(candidate.mode).toBe('dedup');
    expect(candidate.input.event_id).toBeUndefined();
    expect(candidate.eventId).toEqual(expect.any(String));
    expect(candidate.eventId).not.toBe('');
  });

  it('builds the dedup identity from confirmed rules only when any rule is confirmed', () => {
    const [candidate] = buildWriteCandidates([
      makeInput({ signals: [makeSignal('A'), makeSignal('B', 'inconclusive')] }),
    ]);

    expect(candidate).toMatchObject({ mode: 'dedup', ruleUuids: ['A'], confirmedOnly: true });
  });

  it('falls back to every rule when none is confirmed', () => {
    const [candidate] = buildWriteCandidates([
      makeInput({ signals: [makeSignal('A', 'inconclusive'), makeSignal('B', 'refutes')] }),
    ]);

    expect(candidate).toMatchObject({
      mode: 'dedup',
      ruleUuids: ['A', 'B'],
      confirmedOnly: false,
    });
  });
});

describe('markDuplicateKeys', () => {
  it('flags a later in-batch item with the same streams and rules, keeping the first', () => {
    const { results, remaining } = flag([makeInput(), makeInput()]);

    expect(remaining.map((c) => c.index)).toEqual([0]);
    expect(results[1]).toMatchObject({ index: 1, written: false, reason: 'duplicate_in_batch' });
  });

  it.each<[string, ChangePointType | undefined, ChangePointType | undefined]>([
    ['spike vs dip', 'spike', 'dip'],
    ['omitted vs explicit', undefined, 'spike'],
  ])('ignores change_point_type when matching identities (%s)', (_, first, second) => {
    const { results } = flag([
      makeInput({ signals: [makeSignal('rule-abc', 'confirms', first)] }),
      makeInput({ signals: [makeSignal('rule-abc', 'confirms', second)] }),
    ]);

    expect(results[1]).toMatchObject({ reason: 'duplicate_in_batch' });
  });

  it('keeps items with different stream sets or rule sets', () => {
    const { remaining } = flag([
      makeInput(),
      makeInput({ stream_names: ['logs.payments'] }),
      makeInput({ signals: [makeSignal('rule-xyz')] }),
    ]);

    expect(remaining).toHaveLength(3);
  });

  it('keeps a confirmed-only identity apart from an all-verdict identity over the same rules', () => {
    const { remaining } = flag([
      makeInput({ signals: [makeSignal('A')] }),
      makeInput({ signals: [makeSignal('A', 'inconclusive')] }),
    ]);

    expect(remaining).toHaveLength(2);
  });

  it('flags snapshot items that share an event_id', () => {
    const { results, remaining } = flag([
      makeInput({ event_id: 'event-1' }),
      makeInput({ event_id: 'event-1' }),
    ]);

    expect(remaining.map((c) => c.index)).toEqual([0]);
    expect(results[1]).toMatchObject({
      reason: 'duplicate_in_batch',
      error: { type: 'validation_error', status: 400 },
    });
  });
});

describe('fetchActiveEventsForDedup', () => {
  it('does not scan when there are no dedup candidates', async () => {
    const client = makeClient();

    await expect(fetchActiveEventsForDedup(client, [])).resolves.toEqual([]);
    expect(client.findLatestActive).not.toHaveBeenCalled();
  });

  it('runs one scan over the union of every candidate stream and rule', async () => {
    const hit = makeActiveEvent();
    const client = makeClient([hit]);

    const events = await fetchActiveEventsForDedup(
      client,
      dedupCandidates([
        makeInput(),
        makeInput({ stream_names: ['logs.payments'], signals: [makeSignal('rule-xyz')] }),
      ])
    );

    expect(events).toEqual([hit]);
    expect(client.findLatestActive).toHaveBeenCalledTimes(1);
    expect(client.findLatestActive).toHaveBeenCalledWith({
      streamNames: ['logs.checkout', 'logs.payments'],
      ruleUuids: ['rule-abc', 'rule-xyz'],
    });
  });

  it.each<{ field: 'ruleUuids' | 'streamNames'; override: Partial<EventsWriteInput> }>([
    { field: 'ruleUuids', override: { signals: [] } },
    { field: 'streamNames', override: { stream_names: [] } },
  ])('omits $field from the scan when any candidate has none', async ({ field, override }) => {
    const client = makeClient();

    await fetchActiveEventsForDedup(client, dedupCandidates([makeInput(), makeInput(override)]));

    expect(client.findLatestActive).toHaveBeenCalledWith(
      expect.objectContaining({ [field]: undefined })
    );
  });
});

describe('resolveDedupSkips', () => {
  it('skips a candidate covered by an active event and reports the existing event', () => {
    const { results, toWrite } = resolve(
      [makeInput()],
      [makeActiveEvent({ severity: 'critical' })]
    );

    expect(toWrite).toEqual([]);
    expect(results[0]).toEqual({
      index: 0,
      event_id: 'existing-event-id',
      status: 'active',
      written: false,
      skipped: true,
      reason: 'existing_active_event',
      existing_event_id: 'existing-event-id',
      severity: 'critical',
    });
  });

  it('never skips a snapshot candidate', () => {
    const { toWrite } = resolve(
      [makeInput({ event_id: 'existing-event-id' })],
      [makeActiveEvent()]
    );

    expect(toWrite).toHaveLength(1);
  });

  it('ignores an event that is not active', () => {
    const { toWrite } = resolve([makeInput()], [makeActiveEvent({ status: 'inactive' })]);

    expect(toWrite).toHaveLength(1);
  });

  it('dedupes against a stale-timestamped active event', () => {
    const { toWrite } = resolve(
      [makeInput()],
      [makeActiveEvent({ '@timestamp': '2000-01-01T00:00:00.000Z' })]
    );

    expect(toWrite).toEqual([]);
  });

  it.each<[string, ChangePointType | undefined]>([
    ['dip', 'dip'],
    ['omitted', undefined],
    ['empty', '' as ChangePointType],
  ])('ignores change_point_type when matching an active event (%s)', (_, changePointType) => {
    const { toWrite } = resolve(
      [makeInput({ signals: [makeSignal('rule-abc', 'confirms', changePointType)] })],
      [makeActiveEvent({ signals: [makeSignal('rule-abc', 'confirms', 'spike')] })]
    );

    expect(toWrite).toEqual([]);
  });

  describe('rule coverage', () => {
    it('covers a candidate whose rules are a subset of the active event rules', () => {
      const { toWrite } = resolve(
        [makeInput()],
        [makeActiveEvent({ signals: [makeSignal('rule-abc'), makeSignal('rule-xyz')] })]
      );

      expect(toWrite).toEqual([]);
    });

    it('writes a new event when the candidate carries a rule no active event has', () => {
      const { toWrite } = resolve(
        [makeInput({ signals: [makeSignal('rule-xyz')] })],
        [makeActiveEvent()]
      );

      expect(toWrite).toHaveLength(1);
    });

    it('compares confirmed rules only, ignoring non-confirming co-signals', () => {
      const { toWrite } = resolve(
        [makeInput({ signals: [makeSignal('A'), makeSignal('B', 'inconclusive')] })],
        [makeActiveEvent({ signals: [makeSignal('A')] })]
      );

      expect(toWrite).toEqual([]);
    });

    it.each<DetectionSignal['verdict']>(['refutes', 'off_topic', 'inconclusive'])(
      'writes a new event when the active event marks the candidate rule as %s',
      (verdict) => {
        const { toWrite } = resolve(
          [makeInput({ signals: [makeSignal('A')] })],
          [makeActiveEvent({ signals: [makeSignal('A', verdict)] })]
        );

        expect(toWrite).toHaveLength(1);
      }
    );

    it('compares every rule when the candidate has no confirmed rule', () => {
      const { toWrite } = resolve(
        [makeInput({ signals: [makeSignal('A', 'inconclusive')] })],
        [makeActiveEvent({ signals: [makeSignal('A', 'inconclusive')] })]
      );

      expect(toWrite).toEqual([]);
    });

    it('does not dedupe a combined candidate against separate partial-overlap events', () => {
      const { toWrite } = resolve(
        [makeInput({ signals: [makeSignal('A'), makeSignal('B')] })],
        [
          makeActiveEvent({ event_id: 'event-A', signals: [makeSignal('A')] }),
          makeActiveEvent({ event_id: 'event-BC', signals: [makeSignal('B'), makeSignal('C')] }),
        ]
      );

      expect(toWrite).toHaveLength(1);
    });

    it('matches a rule-less candidate only against rule-less events', () => {
      const ruleless = makeInput({ signals: [] });

      expect(resolve([ruleless], [makeActiveEvent()]).toWrite).toHaveLength(1);
      expect(resolve([ruleless], [makeActiveEvent({ signals: [] })]).toWrite).toEqual([]);
    });
  });

  describe('stream overlap', () => {
    it('covers a candidate whose streams are a subset of the active event streams', () => {
      const { toWrite } = resolve(
        [makeInput({ stream_names: ['logs.payments'] })],
        [makeActiveEvent({ stream_names: ['logs.checkout', 'logs.payments'] })]
      );

      expect(toWrite).toEqual([]);
    });

    it('writes a new event when no stream overlaps, even if the rules match', () => {
      const { toWrite } = resolve(
        [makeInput({ stream_names: ['logs.payments'] })],
        [makeActiveEvent({ stream_names: ['logs.checkout'] })]
      );

      expect(toWrite).toHaveLength(1);
    });
  });

  describe('selecting the covering event', () => {
    const covering = (events: SignificantEvent[]): string | undefined => {
      const { results } = resolve([makeInput()], events);
      const [result] = results;
      return result && 'existing_event_id' in result ? result.existing_event_id : undefined;
    };

    it('picks the latest event that confirms the rule, skipping a newer refuting one', () => {
      expect(
        covering([
          makeActiveEvent({ '@timestamp': '2024-01-01T00:00:00.000Z', event_id: 'oldest' }),
          makeActiveEvent({
            '@timestamp': '2024-01-03T00:00:00.000Z',
            event_id: 'newest-refuting',
            signals: [makeSignal('rule-abc', 'refutes')],
          }),
          makeActiveEvent({ '@timestamp': '2024-01-02T00:00:00.000Z', event_id: 'middle' }),
        ])
      ).toBe('middle');
    });

    it('orders by instant when timestamps use different offsets', () => {
      expect(
        covering([
          makeActiveEvent({ '@timestamp': '2024-01-02T00:30:00+01:00', event_id: 'earlier' }),
          makeActiveEvent({ '@timestamp': '2024-01-01T23:45:00Z', event_id: 'later' }),
        ])
      ).toBe('later');
    });

    it('breaks a timestamp tie on the greater event_id', () => {
      const timestamp = '2024-01-01T00:00:00.000Z';

      expect(
        covering([
          makeActiveEvent({ '@timestamp': timestamp, event_id: 'event-a' }),
          makeActiveEvent({ '@timestamp': timestamp, event_id: 'event-b' }),
        ])
      ).toBe('event-b');
    });
  });
});
