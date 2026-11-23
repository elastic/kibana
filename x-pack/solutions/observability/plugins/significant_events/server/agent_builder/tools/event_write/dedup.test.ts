/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalEntry, SignificantEvent } from '@kbn/significant-events-schema';
import {
  buildWriteCandidates,
  fetchInactiveEventsForReuse,
  fetchLiveEventsForDedup,
  findRulesHeldByOtherEvents,
  markDuplicateKeys,
  reopenMatchingInactiveSeries,
  resolveDedupSkips,
} from './dedup';
import type {
  InactiveSeriesHead,
  RuleEventsClient,
} from '../../../lib/significant_events/events/rule_events_client';
import type { BulkResults, DedupCandidate, EventsWriteInput, LoadedCandidate } from './types';

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
    source_id: 'logs.checkout',
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
  source_ids: ['logs.checkout'],
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
    source_ids: ['logs.checkout'],
    signals: [makeSignal('rule-abc')],
    title: 'Test event',
    symptom_hypothesis: 'Test hypothesis',
    summary: 'Test summary',
    confidence: 0.8,
    ...overrides,
  }) as SignificantEvent;

const makeClient = (
  hits: SignificantEvent[] = []
): jest.Mocked<Pick<RuleEventsClient, 'findLatestLive'>> & RuleEventsClient =>
  ({ findLatestLive: jest.fn().mockResolvedValue({ hits }) }) as never;

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
      makeInput({ source_ids: ['logs.payments'] }),
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

describe('fetchLiveEventsForDedup', () => {
  it('does not scan when there are no dedup candidates', async () => {
    const client = makeClient();

    await expect(fetchLiveEventsForDedup(client, [])).resolves.toEqual([]);
    expect(client.findLatestLive).not.toHaveBeenCalled();
  });

  it('runs one scan over the union of every candidate stream and rule', async () => {
    const hit = makeActiveEvent();
    const client = makeClient([hit]);

    const events = await fetchLiveEventsForDedup(
      client,
      dedupCandidates([
        makeInput(),
        makeInput({ source_ids: ['logs.payments'], signals: [makeSignal('rule-xyz')] }),
      ])
    );

    expect(events).toEqual([hit]);
    expect(client.findLatestLive).toHaveBeenCalledTimes(1);
    expect(client.findLatestLive).toHaveBeenCalledWith({
      sourceIds: ['logs.checkout', 'logs.payments'],
      ruleUuids: ['rule-abc', 'rule-xyz'],
    });
  });

  it.each<{ field: 'ruleUuids' | 'sourceIds'; override: Partial<EventsWriteInput> }>([
    { field: 'ruleUuids', override: { signals: [] } },
    { field: 'sourceIds', override: { source_ids: [] } },
  ])('omits $field from the scan when any candidate has none', async ({ field, override }) => {
    const client = makeClient();

    await fetchLiveEventsForDedup(client, dedupCandidates([makeInput(), makeInput(override)]));

    expect(client.findLatestLive).toHaveBeenCalledWith(
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
        [makeInput({ source_ids: ['logs.payments'] })],
        [makeActiveEvent({ source_ids: ['logs.checkout', 'logs.payments'] })]
      );

      expect(toWrite).toEqual([]);
    });

    it('writes a new event when no stream overlaps, even if the rules match', () => {
      const { toWrite } = resolve(
        [makeInput({ source_ids: ['logs.payments'] })],
        [makeActiveEvent({ source_ids: ['logs.checkout'] })]
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

const makeInactiveClient = (
  hits: SignificantEvent[] = []
): jest.Mocked<Pick<RuleEventsClient, 'findLatestInactiveByIdentity'>> & RuleEventsClient =>
  ({ findLatestInactiveByIdentity: jest.fn().mockResolvedValue({ hits, heads: [] }) }) as never;

describe('fetchInactiveEventsForReuse', () => {
  const now = Date.parse('2026-10-28T12:00:00.000Z');

  it('bounds the read by the lookback it is given, not a fixed window', async () => {
    const client = makeInactiveClient();

    await fetchInactiveEventsForReuse({
      eventSearchClient: client,
      dedupCandidates: dedupCandidates([makeInput()]),
      inactiveLookbackMs: 6 * 60 * 60 * 1000,
      now,
    });

    expect(client.findLatestInactiveByIdentity).toHaveBeenCalledWith({
      sourceIds: ['logs.checkout'],
      ruleUuids: ['rule-abc'],
      inactiveSince: '2026-10-28T06:00:00.000Z',
    });
  });
});

describe('reopenMatchingInactiveSeries', () => {
  const makeInactiveEvent = (overrides: Partial<SignificantEvent> = {}): SignificantEvent =>
    makeActiveEvent({ status: 'inactive', event_id: 'closed-event-id', ...overrides });

  const headsOf = (events: SignificantEvent[]): InactiveSeriesHead[] =>
    events.flatMap(({ event_id: eventId }) =>
      eventId === undefined
        ? []
        : [{ eventId, groupHash: `group-${eventId}`, episodeId: `episode-${eventId}` }]
    );
  const reopen = (
    inputs: EventsWriteInput[],
    events: SignificantEvent[],
    heads: InactiveSeriesHead[] = headsOf(events),
    deactivatedGroupHashes: ReadonlySet<string> = new Set()
  ) =>
    reopenMatchingInactiveSeries({
      candidates: buildWriteCandidates(inputs),
      inactive: { events, heads },
      deactivatedGroupHashes,
    });

  it('reuses the event_id of a closed series with the exact same identity, and records its head for the deactivation check', () => {
    const [candidate] = reopen([makeInput()], [makeInactiveEvent()]);

    expect(candidate).toMatchObject({
      mode: 'snapshot',
      index: 0,
      eventId: 'closed-event-id',
      input: { event_id: 'closed-event-id', title: 'Checkout latency' },
      reopensSeries: {
        groupHash: 'group-closed-event-id',
        episodeId: 'episode-closed-event-id',
      },
    });
  });

  it('reuses a series closed while recovering, which holds the rule only as refuted', () => {
    const [candidate] = reopen(
      [makeInput()],
      [makeInactiveEvent({ signals: [makeSignal('rule-abc', 'refutes')] })]
    );

    expect(candidate).toMatchObject({ mode: 'snapshot', eventId: 'closed-event-id' });
  });

  it('does not reuse a series for a rule it only refuted while it still confirms another rule', () => {
    const [candidate] = reopen(
      [makeInput({ signals: [makeSignal('rule-def')] })],
      [makeInactiveEvent({ signals: [makeSignal('rule-abc'), makeSignal('rule-def', 'refutes')] })]
    );

    expect(candidate.mode).toBe('dedup');
  });

  it('leaves the batch a new event when the closed series has no known latest episode', () => {
    const [candidate] = reopen([makeInput()], [makeInactiveEvent()], []);

    expect(candidate.mode).toBe('dedup');
  });

  it('does not reopen a series that lacks one of the batch rules', () => {
    const [candidate] = reopen(
      [makeInput({ signals: [makeSignal('rule-abc'), makeSignal('rule-def')] })],
      [makeInactiveEvent()]
    );

    expect(candidate.mode).toBe('dedup');
  });

  it('requires a shared source', () => {
    const [candidate] = reopen([makeInput()], [makeInactiveEvent({ source_ids: ['logs.cart'] })]);

    expect(candidate.mode).toBe('dedup');
  });

  it('reopens the series an operator deactivated, even when a newer one also matches', () => {
    const older = makeInactiveEvent({
      event_id: 'older',
      '@timestamp': '2026-10-27T01:00:00.000Z',
    });
    const newer = makeInactiveEvent({
      event_id: 'newer',
      '@timestamp': '2026-10-28T01:00:00.000Z',
    });

    const [candidate] = reopen([makeInput()], [older, newer], undefined, new Set(['group-older']));

    expect(candidate).toMatchObject({
      eventId: 'older',
      reopensSeries: { groupHash: 'group-older' },
    });
  });

  it('prefers the closest fit over a broader series, even a newer one', () => {
    const exact = makeInactiveEvent({
      event_id: 'exact',
      '@timestamp': '2026-10-27T01:00:00.000Z',
    });
    const broad = makeInactiveEvent({
      event_id: 'broad',
      '@timestamp': '2026-10-28T01:00:00.000Z',
      signals: [makeSignal('rule-abc'), makeSignal('rule-def'), makeSignal('rule-ghi')],
    });

    const [candidate] = reopen([makeInput()], [exact, broad]);

    expect(candidate.eventId).toBe('exact');
  });

  it('prefers the closest fit over a broader series an operator deactivated', () => {
    const exact = makeInactiveEvent({ event_id: 'exact' });
    const broad = makeInactiveEvent({
      event_id: 'broad',
      signals: [makeSignal('rule-abc'), makeSignal('rule-def')],
    });

    const [candidate] = reopen([makeInput()], [exact, broad], undefined, new Set(['group-broad']));

    expect(candidate.eventId).toBe('exact');
  });

  it('reopens the newest matching series when no match was deactivated', () => {
    const older = makeInactiveEvent({
      event_id: 'older',
      '@timestamp': '2026-10-27T01:00:00.000Z',
    });
    const newer = makeInactiveEvent({
      event_id: 'newer',
      '@timestamp': '2026-10-28T01:00:00.000Z',
    });

    const [candidate] = reopen([makeInput()], [older, newer], undefined, new Set(['group-other']));

    expect(candidate.eventId).toBe('newer');
  });

  it('compares confirmed rules only when the candidate has confirmed rules', () => {
    const [candidate] = reopen(
      [makeInput({ signals: [makeSignal('rule-abc'), makeSignal('rule-def', 'refutes')] })],
      [makeInactiveEvent()]
    );

    expect(candidate).toMatchObject({ mode: 'snapshot', eventId: 'closed-event-id' });
  });

  it('leaves snapshot candidates and candidates without rules untouched', () => {
    const results = reopen(
      [makeInput({ event_id: 'explicit-id' }), makeInput({ signals: [] })],
      [makeInactiveEvent()]
    );

    expect(results.map((c) => c.mode)).toEqual(['snapshot', 'dedup']);
    expect(results[0].eventId).toBe('explicit-id');
  });
});

describe('findRulesHeldByOtherEvents', () => {
  const liveEvent = (
    eventId: string,
    signals: SignalEntry[],
    overrides: Partial<SignificantEvent> = {}
  ): SignificantEvent =>
    ({
      '@timestamp': '2024-01-01T00:00:00.000Z',
      event_id: eventId,
      status: 'active',
      source_ids: ['logs.other'],
      signals,
      ...overrides,
    }) as SignificantEvent;
  const candidateFor = ({
    eventId = 'target',
    ruleUuids,
    latest,
    verdict = 'confirms',
  }: {
    eventId?: string;
    ruleUuids: string[];
    latest?: SignificantEvent;
    verdict?: DetectionSignal['verdict'];
  }): LoadedCandidate => ({
    mode: 'snapshot',
    index: 0,
    eventId,
    input: makeInput({
      event_id: eventId,
      signals: ruleUuids.map((uuid) => makeSignal(uuid, verdict)),
    }),
    latest,
    priorDocs: latest ? [latest] : [],
  });

  it('returns the rules another live event confirms, with the holder', () => {
    const holder = liveEvent('holder', [makeSignal('rule-a')]);

    expect(
      findRulesHeldByOtherEvents({
        candidate: candidateFor({ ruleUuids: ['rule-a', 'rule-free'] }),
        liveEvents: [holder],
      })
    ).toEqual({ holder, heldRules: [{ rule_uuid: 'rule-a', event_id: 'holder' }] });
  });

  it.each<DetectionSignal['verdict']>(['refutes', 'off_topic', 'inconclusive'])(
    'ignores a holder whose latest verdict for the rule is %s',
    (verdict) => {
      expect(
        findRulesHeldByOtherEvents({
          candidate: candidateFor({ ruleUuids: ['rule-a'] }),
          liveEvents: [liveEvent('holder', [makeSignal('rule-a', verdict)])],
        })
      ).toBeUndefined();
    }
  );

  it("ignores an inactive event and the item's own event", () => {
    expect(
      findRulesHeldByOtherEvents({
        candidate: candidateFor({ ruleUuids: ['rule-a'] }),
        liveEvents: [
          liveEvent('closed', [makeSignal('rule-a')], { status: 'inactive' }),
          liveEvent('target', [makeSignal('rule-a')]),
        ],
      })
    ).toBeUndefined();
  });

  it('checks every incoming verdict, not only confirms rows', () => {
    expect(
      findRulesHeldByOtherEvents({
        candidate: candidateFor({ ruleUuids: ['rule-a'], verdict: 'refutes' }),
        liveEvents: [liveEvent('holder', [makeSignal('rule-a')])],
      })?.heldRules
    ).toEqual([{ rule_uuid: 'rule-a', event_id: 'holder' }]);
  });

  it('exempts a rule the live target already confirms, so an existing duplicate can still write', () => {
    const latest = liveEvent('target', [makeSignal('rule-a')]);

    expect(
      findRulesHeldByOtherEvents({
        candidate: candidateFor({ ruleUuids: ['rule-a'], latest }),
        liveEvents: [liveEvent('holder', [makeSignal('rule-a')])],
      })
    ).toBeUndefined();
  });

  it.each<[DetectionSignal['verdict'], DetectionSignal['verdict']]>([
    ['refutes', 'refutes'],
    ['refutes', 'off_topic'],
    ['off_topic', 'inconclusive'],
    ['inconclusive', 'refutes'],
  ])(
    'exempts a rule the live target holds as %s for a write whose verdict is %s',
    (targetVerdict, incomingVerdict) => {
      const latest = liveEvent('target', [makeSignal('rule-a', targetVerdict)], {
        status: 'recovering',
      });

      expect(
        findRulesHeldByOtherEvents({
          candidate: candidateFor({ ruleUuids: ['rule-a'], latest, verdict: incomingVerdict }),
          liveEvents: [liveEvent('holder', [makeSignal('rule-a')])],
        })
      ).toBeUndefined();
    }
  );

  it('holds a write that carries a confirming and a refuting row for a rule the target holds as refutes', () => {
    const latest = liveEvent('target', [makeSignal('rule-a', 'refutes')], {
      status: 'recovering',
    });
    const candidate = candidateFor({ ruleUuids: ['rule-a'], latest });

    expect(
      findRulesHeldByOtherEvents({
        candidate: {
          ...candidate,
          input: {
            ...candidate.input,
            signals: [makeSignal('rule-a', 'refutes'), makeSignal('rule-a', 'confirms')],
          },
        },
        liveEvents: [liveEvent('holder', [makeSignal('rule-a')])],
      })?.heldRules
    ).toEqual([{ rule_uuid: 'rule-a', event_id: 'holder' }]);
  });

  it.each<DetectionSignal['verdict']>(['refutes', 'off_topic', 'inconclusive'])(
    'holds a write that confirms a rule the live target holds as %s while another event confirms it',
    (verdict) => {
      const latest = liveEvent('target', [makeSignal('rule-a', verdict)], {
        status: 'recovering',
      });

      expect(
        findRulesHeldByOtherEvents({
          candidate: candidateFor({ ruleUuids: ['rule-a'], latest }),
          liveEvents: [liveEvent('holder', [makeSignal('rule-a')])],
        })?.heldRules
      ).toEqual([{ rule_uuid: 'rule-a', event_id: 'holder' }]);
    }
  );

  it('gives a closed series no exemption for the rules it holds', () => {
    const latest = liveEvent('target', [makeSignal('rule-a')], { status: 'inactive' });

    expect(
      findRulesHeldByOtherEvents({
        candidate: candidateFor({ ruleUuids: ['rule-a'], latest }),
        liveEvents: [liveEvent('holder', [makeSignal('rule-a')])],
      })?.holder.event_id
    ).toBe('holder');
  });

  it('names the newest holder and lists each rule with its own holder, in incoming order', () => {
    const older = liveEvent('older', [makeSignal('rule-1')]);
    const newer = liveEvent('newer', [makeSignal('rule-2')], {
      '@timestamp': '2024-02-01T00:00:00.000Z',
    });

    expect(
      findRulesHeldByOtherEvents({
        candidate: candidateFor({ ruleUuids: ['rule-1', 'rule-2'] }),
        liveEvents: [older, newer],
      })
    ).toEqual({
      holder: newer,
      heldRules: [
        { rule_uuid: 'rule-1', event_id: 'older' },
        { rule_uuid: 'rule-2', event_id: 'newer' },
      ],
    });
  });

  it('picks the newest event for a rule that several events confirm', () => {
    const older = liveEvent('older', [makeSignal('rule-a')]);
    const newer = liveEvent('newer', [makeSignal('rule-a')], {
      '@timestamp': '2024-02-01T00:00:00.000Z',
    });

    expect(
      findRulesHeldByOtherEvents({
        candidate: candidateFor({ ruleUuids: ['rule-a'] }),
        liveEvents: [older, newer],
      })?.heldRules
    ).toEqual([{ rule_uuid: 'rule-a', event_id: 'newer' }]);
  });

  it('returns undefined for an item with no rules', () => {
    expect(
      findRulesHeldByOtherEvents({
        candidate: candidateFor({ ruleUuids: [] }),
        liveEvents: [liveEvent('holder', [makeSignal('rule-a')])],
      })
    ).toBeUndefined();
  });
});
