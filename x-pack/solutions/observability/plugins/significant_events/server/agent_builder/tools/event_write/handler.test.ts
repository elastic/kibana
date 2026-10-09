/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { eventsWriteBulkHandler, eventsWriteHandler } from './handler';
import type { EventsWriteInput } from './types';
import type {
  SignificantEvent,
  SignalEntry,
  BlastRadiusEntry,
  CausalFeature,
} from '@kbn/significant-events-schema';
import type { AlertEventsClientApi } from '@kbn/alerting-v2-plugin/server';
import type { Logger } from '@kbn/core/server';
import type { RuleEventsClient } from '../../../lib/significant_events/events/rule_events_client';
import { EVENT_CREATED_TRIGGER_ID } from '../../../../common/workflows/triggers';
import { toRuleEvent } from '../../../lib/significant_events/events/to_rule_event';

const TS_EARLIER = '2024-01-01T00:00:00.000Z';

const baseInput: EventsWriteInput = {
  status: 'active',
  stream_names: ['logs.checkout'],
  title: 'Checkout latency',
  symptom_hypothesis: 'Checkout requests are delayed because the payment dependency is timing out.',
  summary: 'P99 latency breached SLO',
  severity: 'high',
  confidence: 0.82,
  assessment_note: 'Verified via execute_esql',
  signals: [],
  causal_features: [],
  blast_radius: [],
};

/** Returns a minimal stored SignificantEvent with sensible defaults. */
const makeStoredEvent = (
  eventId: string,
  overrides: Partial<SignificantEvent> = {}
): SignificantEvent =>
  ({
    '@timestamp': TS_EARLIER,
    event_id: eventId,
    status: 'active',
    severity: 'high',
    stream_names: ['logs.checkout'],
    signals: [],
    title: 'Test event',
    symptom_hypothesis: 'Test hypothesis',
    summary: 'Test summary',
    confidence: 0.8,
    ...overrides,
  } as SignificantEvent);

type SearchClientMethods =
  | 'findLatestPaginated'
  | 'findLatestByCurrentStatePaginated'
  | 'findLatestActive'
  | 'findByEventId'
  | 'findLatestByEventId';

/** Typed `.rule-events` read client mock; override individual methods by passing a partial mock. */
const makeEventSearchClient = (
  overrides: Partial<jest.Mocked<Pick<RuleEventsClient, SearchClientMethods>>> = {}
): jest.Mocked<Pick<RuleEventsClient, SearchClientMethods>> & RuleEventsClient =>
  ({
    findLatestPaginated: jest.fn(),
    findLatestByCurrentStatePaginated: jest.fn(),
    findLatestActive: jest.fn().mockResolvedValue({ hits: [] }),
    findByEventId: jest.fn().mockResolvedValue({ hits: [] }),
    findLatestByEventId: jest.fn(),
    ...overrides,
  } as never);

const makeAlertEventsClient = (
  overrides: Partial<jest.Mocked<AlertEventsClientApi>> = {}
): jest.Mocked<AlertEventsClientApi> =>
  ({
    createAlertEvent: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as jest.Mocked<AlertEventsClientApi>);

let alertEventsClient: jest.Mocked<AlertEventsClientApi>;

beforeEach(() => {
  alertEventsClient = makeAlertEventsClient();
});

/** Documents written through `createAlertEvent`, reconstructed from the `.rule-events` payload. */
const writtenDocs = (): SignificantEvent[] =>
  alertEventsClient.createAlertEvent.mock.calls.map(
    ([ruleEvent]) =>
      ({
        ...ruleEvent.data,
        '@timestamp': ruleEvent.timestamp,
        event_id: ruleEvent.fingerprint,
        status: ruleEvent.alert_status,
        severity: ruleEvent.severity,
      } as unknown as SignificantEvent)
  );

const makeLogger = (): jest.Mocked<Logger> =>
  ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  } as unknown as jest.Mocked<Logger>);

describe('eventsWriteHandler', () => {
  it('writes a new event', async () => {
    const eventClient = makeEventSearchClient();

    const result = await eventsWriteHandler({
      eventSearchClient: eventClient,
      alertEventsClient,
      input: { ...baseInput, event_id: 'checkout__latency-abc12345' },
    });

    expect(alertEventsClient.createAlertEvent).toHaveBeenCalledTimes(1);
    expect(writtenDocs()[0].symptom_hypothesis).toBe(baseInput.symptom_hypothesis);
    expect(result.written).toBe(true);
    if (result.written) {
      expect(result.event_id).toBe('checkout__latency-abc12345');
      expect(result.status).toBe('active');
    }
  });

  it('skips latest-version lookup when event_id is absent', async () => {
    const findByEventId = jest.fn();
    const eventClient = makeEventSearchClient({
      findByEventId,
    });

    const result = await eventsWriteHandler({
      eventSearchClient: eventClient,
      alertEventsClient,
      input: { ...baseInput },
    });
    expect(findByEventId).not.toHaveBeenCalled();
    expect(result.written).toBe(true);
    if (result.written) {
      expect(result.event_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    }
  });

  it('treats an empty event_id as absent and generates a synthetic ID', async () => {
    const eventClient = makeEventSearchClient({});

    const result = await eventsWriteHandler({
      eventSearchClient: eventClient,
      alertEventsClient,
      input: { ...baseInput, event_id: '' },
    });
    if (result.written) {
      expect(writtenDocs()[0].event_id).toBe(result.event_id);
    }
  });

  it('does not persist a legacy version identifier', async () => {
    const stored = makeStoredEvent('checkout__latency-abc12345', {
      status: 'inactive',
    });
    const eventClient = makeEventSearchClient({
      findByEventId: jest.fn().mockResolvedValue({ hits: [stored] }),
    });

    const result = await eventsWriteHandler({
      eventSearchClient: eventClient,
      alertEventsClient,
      input: { ...baseInput, event_id: 'checkout__latency-abc12345', status: 'active' },
    });

    expect(alertEventsClient.createAlertEvent).toHaveBeenCalledTimes(1);
    expect(writtenDocs()[0]).not.toHaveProperty('previous_event_uuid');
    expect(result.written).toBe(true);
  });

  // An inactive stored event ensures severity+status differ from the active input,
  // so the no-op guard does not fire and a write reaches createAlertEvent in both cases.
  it.each([
    [
      'carries investigations lineage forward when present',
      [
        { workflow_execution_id: 'wf-1', started_at: '2024-01-01T00:00:00.000Z' },
      ] as SignificantEvent['investigations'],
    ],
    ['leaves investigations undefined when absent', undefined],
  ])('%s on re-open continuation', async (_, storedInvestigations) => {
    const stored = makeStoredEvent('checkout__latency-abc12345', {
      status: 'inactive',
      investigations: storedInvestigations,
    });
    const eventClient = makeEventSearchClient({
      findByEventId: jest.fn().mockResolvedValue({ hits: [stored] }),
    });

    await eventsWriteHandler({
      eventSearchClient: eventClient,
      alertEventsClient,
      input: { ...baseInput, event_id: 'checkout__latency-abc12345' },
    });

    expect(writtenDocs()[0].investigations).toEqual(storedInvestigations);
  });

  describe('unchanged_outcome (no-op guard)', () => {
    it('returns EventsWriteNoOpResult when severity and status are unchanged for a snapshot candidate', async () => {
      // A signal-less candidate keeps its explicit severity ('high' from baseInput); the stored
      // fixture matches it to exercise the no-op path.
      const stored = makeStoredEvent('checkout-stable', { severity: 'high' });
      const eventClient = makeEventSearchClient({
        findByEventId: jest.fn().mockResolvedValue({ hits: [stored] }),
      });

      const result = await eventsWriteHandler({
        eventSearchClient: eventClient,
        alertEventsClient,
        input: { ...baseInput, event_id: 'checkout-stable', status: 'active', severity: 'high' },
      });

      expect(result.written).toBe(false);
      if (!result.written) {
        expect(result.reason).toBe('unchanged_outcome');
        expect(result.event_id).toBe('checkout-stable');
        expect(result.skipped).toBe(true);
      }
      expect(alertEventsClient.createAlertEvent).not.toHaveBeenCalled();
      expect(eventClient.findByEventId).toHaveBeenCalledWith('checkout-stable');
    });

    it('writes when an unchanged snapshot adds a detection rule not present in its history', async () => {
      const ruleOne: SignalEntry = {
        type: 'detection',
        stream_name: 'logs.checkout',
        description: 'Rule one detected an issue',
        verdict: 'confirms',
        metadata: {
          detection_id: 'det-rule-1',
          rule_uuid: 'rule-1',
          change_point_type: 'spike',
          p_value: 0.01,
        },
      };
      const ruleTwo: SignalEntry = {
        type: 'detection',
        stream_name: 'logs.checkout',
        description: 'Rule two detected an issue',
        verdict: 'confirms',
        metadata: {
          detection_id: 'det-rule-2',
          rule_uuid: 'rule-2',
          change_point_type: 'spike',
          p_value: 0.01,
        },
      };
      const stored = makeStoredEvent('checkout-stable', {
        signals: [ruleOne],
      });
      const eventClient = makeEventSearchClient({
        findByEventId: jest.fn().mockResolvedValue({ hits: [stored] }),
      });

      const result = await eventsWriteHandler({
        eventSearchClient: eventClient,
        alertEventsClient,
        input: {
          ...baseInput,
          event_id: 'checkout-stable',
          status: 'active',
          severity: 'high',
          signals: [ruleTwo],
        },
      });

      expect(result.written).toBe(true);
      expect(alertEventsClient.createAlertEvent).toHaveBeenCalledTimes(1);
      expect(writtenDocs()[0].signals).toEqual(expect.arrayContaining([ruleOne, ruleTwo]));
    });

    it('skips when an unchanged snapshot resubmits a rule absent from the latest version', async () => {
      const ruleOne: SignalEntry = {
        type: 'detection',
        stream_name: 'logs.checkout',
        description: 'Rule one detected an issue',
        verdict: 'confirms',
        metadata: {
          detection_id: 'det-rule-1',
          rule_uuid: 'rule-1',
          change_point_type: 'spike',
          p_value: 0.01,
        },
      };
      // ruleOne has no `impact`, so the merged signal set computes to 'low' regardless of the
      // input.severity — match the stored fixture to that so the no-op path, not
      // an escalation write, is what's under test here.
      const latest = makeStoredEvent('checkout-stable', { severity: 'low' });
      const eventClient = makeEventSearchClient({
        findByEventId: jest.fn().mockResolvedValue({
          hits: [
            makeStoredEvent('checkout-stable', { signals: [ruleOne], severity: 'low' }),
            latest,
          ],
        }),
      });

      const result = await eventsWriteHandler({
        eventSearchClient: eventClient,
        alertEventsClient,
        input: {
          ...baseInput,
          event_id: 'checkout-stable',
          status: 'active',
          signals: [ruleOne],
        },
      });

      expect(result).toMatchObject({ written: false, reason: 'unchanged_outcome' });
      expect(alertEventsClient.createAlertEvent).not.toHaveBeenCalled();
    });

    it('throws when the bulk result is existing_active_event (wrapper does not swallow skips)', async () => {
      const eventClient = makeEventSearchClient({
        findLatestActive: jest.fn().mockResolvedValue({
          hits: [makeStoredEvent('existing-event-id')],
        }),
      });

      // No event_id → find-or-create; the active event match returns existing_active_event,
      // which the single-item wrapper must throw rather than silently return.
      await expect(
        eventsWriteHandler({
          eventSearchClient: eventClient,
          alertEventsClient,
          input: { ...baseInput },
        })
      ).rejects.toMatchObject({ code: 'outcome_unknown' });
    });
  });
});

describe('eventsWriteBulkHandler', () => {
  it('writes unique event ids with one lineage lookup per event and one write per event', async () => {
    const eventClient = makeEventSearchClient();

    const results = await eventsWriteBulkHandler({
      eventSearchClient: eventClient,
      alertEventsClient,
      inputs: [
        { ...baseInput, event_id: 'event-1' },
        { ...baseInput, event_id: 'event-2', status: 'inactive' },
      ],
    });

    expect(eventClient.findByEventId).toHaveBeenCalledTimes(2);
    expect(eventClient.findByEventId).toHaveBeenCalledWith('event-1');
    expect(eventClient.findByEventId).toHaveBeenCalledWith('event-2');
    expect(alertEventsClient.createAlertEvent).toHaveBeenCalledTimes(2);
    expect(writtenDocs()).toHaveLength(2);
    expect(results).toEqual([
      expect.objectContaining({ index: 0, event_id: 'event-1', written: true }),
      expect.objectContaining({ index: 1, event_id: 'event-2', written: true }),
    ]);
  });

  it('returns per-item errors for duplicate event_ids without throwing', async () => {
    const eventClient = makeEventSearchClient();

    const results = await eventsWriteBulkHandler({
      eventSearchClient: eventClient,
      alertEventsClient,
      inputs: [
        { ...baseInput, event_id: 'duplicate' },
        { ...baseInput, event_id: 'duplicate' },
      ],
    });

    expect(results[0]).toEqual(expect.objectContaining({ index: 0, written: true }));
    expect(results[1]).toEqual(
      expect.objectContaining({ index: 1, written: false, reason: 'duplicate_in_batch' })
    );
    expect(alertEventsClient.createAlertEvent).toHaveBeenCalledTimes(1);
  });

  it('routes to find-or-create (dedup scan) when event_id is absent', async () => {
    const findLatestActive = jest.fn().mockResolvedValue({ hits: [] });
    const eventClient = makeEventSearchClient({ findLatestActive });

    const results = await eventsWriteBulkHandler({
      eventSearchClient: eventClient,
      alertEventsClient,
      inputs: [{ ...baseInput }],
    });

    // find-or-create: dedup scan runs, no snapshot lineage lookup needed.
    expect(findLatestActive).toHaveBeenCalledTimes(1);
    expect(results[0]).toMatchObject({ index: 0, written: true });
  });
});

describe('eventsWriteBulkHandler — dedup mode', () => {
  const makeDetectionSignal = (ruleUuid = 'rule-abc'): SignalEntry => ({
    type: 'detection',
    stream_name: 'logs.checkout',
    description: 'High Latency',
    verdict: 'confirms',
    impact: 'degraded',
    metadata: {
      detection_id: `det-${ruleUuid}`,
      rule_uuid: ruleUuid,
      rule_name: ruleUuid,
      change_point_type: 'spike',
      p_value: 0.01,
    },
  });
  const dedupInput: EventsWriteInput = { ...baseInput, signals: [makeDetectionSignal()] };

  it('skips the write and returns the existing event_id when an active duplicate is found', async () => {
    const eventClient = makeEventSearchClient({
      findLatestActive: jest.fn().mockResolvedValue({
        hits: [
          makeStoredEvent('existing-event-id', {
            '@timestamp': new Date().toISOString(),
            signals: dedupInput.signals,
          }),
        ],
      }),
    });

    const results = await eventsWriteBulkHandler({
      eventSearchClient: eventClient,
      alertEventsClient,
      inputs: [dedupInput],
    });

    expect(results[0]).toMatchObject({
      index: 0,
      written: false,
      skipped: true,
      reason: 'existing_active_event',
      existing_event_id: 'existing-event-id',
    });
    expect(alertEventsClient.createAlertEvent).not.toHaveBeenCalled();
  });

  it('writes the first of two in-batch duplicates and flags the second', async () => {
    const results = await eventsWriteBulkHandler({
      eventSearchClient: makeEventSearchClient(),
      alertEventsClient,
      inputs: [dedupInput, { ...dedupInput }],
    });

    expect(results[0]).toMatchObject({ index: 0, written: true });
    expect(results[1]).toMatchObject({ index: 1, written: false, reason: 'duplicate_in_batch' });
    expect(writtenDocs()).toHaveLength(1);
  });

  it('rejects an unknown continuation id without blocking valid new items', async () => {
    const eventSearchClient = makeEventSearchClient();

    const results = await eventsWriteBulkHandler({
      eventSearchClient,
      alertEventsClient,
      rejectUnknownEventIds: true,
      inputs: [{ ...baseInput, event_id: 'unknown-event-id' }, dedupInput],
    });

    expect(results[0]).toEqual({
      index: 0,
      event_id: 'unknown-event-id',
      status: 'active',
      written: false,
      reason: 'unknown_event_id',
      error: {
        type: 'validation_error',
        reason:
          'event_id "unknown-event-id" does not exist. Do not retry this item in the current run or reuse this id. Leave it unprocessed so the next discovery cycle routes it again from fresh search results.',
        status: 404,
      },
    });
    expect(results[1]).toMatchObject({ index: 1, written: true });
    expect(alertEventsClient.createAlertEvent).toHaveBeenCalledTimes(1);
    expect(writtenDocs()).toHaveLength(1);
    expect(writtenDocs()[0].event_id).not.toBe('unknown-event-id');
  });

  it('copies investigations from the .rule-events lineage on continuation', async () => {
    const eventId = 'known-canonical-event';
    const canonicalInvestigations = [
      { workflow_execution_id: 'wf-canonical', started_at: '2024-01-01T00:00:00.000Z' },
    ] as SignificantEvent['investigations'];
    const canonicalEvent = makeStoredEvent(eventId, {
      investigations: canonicalInvestigations,
      severity: 'medium',
    });
    const eventSearchClient = makeEventSearchClient({
      findByEventId: jest.fn().mockResolvedValue({ hits: [canonicalEvent] }),
    });

    const [result] = await eventsWriteBulkHandler({
      eventSearchClient,
      alertEventsClient,
      rejectUnknownEventIds: true,
      inputs: [{ ...baseInput, event_id: eventId }],
    });

    expect(result).toMatchObject({ event_id: eventId, written: true });
    expect(eventSearchClient.findByEventId).toHaveBeenCalledWith(eventId);
    expect(writtenDocs()[0].investigations).toEqual(canonicalInvestigations);
  });
});

describe('eventsWriteBulkHandler — continuation status', () => {
  it.each<[string, SignificantEvent['status']]>([
    ['active', 'active'],
    ['inactive', 'inactive'],
  ])('persists %s status from discovery through to the bulk payload', async (_, status) => {
    const eventId = `checkout-${status}`;
    const stored = makeStoredEvent(eventId, { status, severity: undefined });
    const eventClient = makeEventSearchClient({
      findByEventId: jest.fn().mockResolvedValue({ hits: [stored] }),
    });

    const results = await eventsWriteBulkHandler({
      eventSearchClient: eventClient,
      alertEventsClient,
      inputs: [{ ...baseInput, event_id: eventId, status }],
    });

    expect(results[0]).toMatchObject({ written: true, status });
    expect(writtenDocs()[0].status).toBe(status);
  });

  it.each<[string, Partial<EventsWriteInput>, SignificantEvent['status']]>([
    ['severity escalates (high → critical)', { status: 'active', severity: 'critical' }, 'active'],
    [
      'status transitions (active → inactive)',
      { status: 'inactive', severity: 'high' },
      'inactive',
    ],
  ])(
    'write-through: writes when %s (no-op does not fire)',
    async (_, inputOverrides, expectedStatus) => {
      const stored = makeStoredEvent('checkout-changing');
      const eventClient = makeEventSearchClient({
        findByEventId: jest.fn().mockResolvedValue({ hits: [stored] }),
      });

      const results = await eventsWriteBulkHandler({
        eventSearchClient: eventClient,
        alertEventsClient,
        inputs: [{ ...baseInput, event_id: 'checkout-changing', ...inputOverrides }],
      });

      expect(results[0]).toMatchObject({ written: true, status: expectedStatus });
      expect(alertEventsClient.createAlertEvent).toHaveBeenCalledTimes(1);
    }
  );
});

describe('eventsWriteBulkHandler — severity floor on inactive', () => {
  it('floors an otherwise-critical computed severity to low when status is inactive', async () => {
    const exposureSignal: SignalEntry = {
      type: 'detection',
      stream_name: 'logs.checkout',
      description: 'Found: credentials exposed in logs. Impact: active exposure.',
      verdict: 'confirms',
      impact: 'exposed',
      metadata: {
        detection_id: 'det-exposure',
        rule_uuid: 'rule-exposure',
        change_point_type: 'spike',
        p_value: 0.01,
      },
    } as SignalEntry;

    const eventClient = makeEventSearchClient({
      findByEventId: jest.fn().mockResolvedValue({ hits: [] }),
    });

    const results = await eventsWriteBulkHandler({
      eventSearchClient: eventClient,
      alertEventsClient,
      inputs: [
        {
          ...baseInput,
          status: 'inactive',
          signals: [exposureSignal],
        },
      ],
    });

    expect(results[0]).toMatchObject({ written: true, status: 'inactive' });
    expect(writtenDocs()[0].severity).toBe('low');
  });
});

describe('eventsWriteBulkHandler — investigation severity calibration', () => {
  const completedInvestigation: NonNullable<SignificantEvent['investigations']>[number] = {
    workflow_execution_id: 'workflow-1',
    started_at: '2026-01-01T00:00:00.000Z',
    completed_at: '2026-01-01T01:00:00.000Z',
  };
  const makeDetectionSignal = (
    ruleUuid: string,
    verdict: Extract<SignalEntry, { type: 'detection' }>['verdict'] = 'confirms'
  ): Extract<SignalEntry, { type: 'detection' }> => ({
    type: 'detection',
    stream_name: 'logs.checkout',
    description: `Signal for ${ruleUuid}`,
    verdict,
    impact: 'degraded',
    metadata: {
      detection_id: `detection-${ruleUuid}`,
      rule_uuid: ruleUuid,
      change_point_type: 'spike',
      p_value: 0.01,
    },
  });
  const makeInvestigatedEvent = (overrides: Partial<SignificantEvent> = {}): SignificantEvent =>
    makeStoredEvent('investigated-event', {
      severity: 'medium',
      signals: [makeDetectionSignal('rule-1')],
      investigations: [completedInvestigation],
      ...overrides,
    });

  it('calibrates before the no-op check and skips a same-rule severity change', async () => {
    const stored = makeInvestigatedEvent();
    const eventClient = makeEventSearchClient({
      findByEventId: jest.fn().mockResolvedValue({ hits: [stored] }),
    });

    const [result] = await eventsWriteBulkHandler({
      eventSearchClient: eventClient,
      alertEventsClient,
      source: 'discovery',
      inputs: [
        {
          ...baseInput,
          event_id: stored.event_id,
          severity: 'critical',
          signals: [makeDetectionSignal('rule-1')],
        },
      ],
    });

    expect(result).toMatchObject({ written: false, reason: 'unchanged_outcome' });
    expect(alertEventsClient.createAlertEvent).not.toHaveBeenCalled();
  });

  it('writes a new unconfirmed rule with the investigated severity', async () => {
    const stored = makeInvestigatedEvent();
    const eventClient = makeEventSearchClient({
      findByEventId: jest.fn().mockResolvedValue({ hits: [stored] }),
    });

    await eventsWriteBulkHandler({
      eventSearchClient: eventClient,
      alertEventsClient,
      source: 'discovery',
      inputs: [
        {
          ...baseInput,
          event_id: stored.event_id,
          severity: 'critical',
          signals: [makeDetectionSignal('rule-2', 'inconclusive')],
        },
      ],
    });

    expect(writtenDocs()[0].severity).toBe('medium');
  });

  it('accepts severity from a new confirmed rule', async () => {
    const stored = makeInvestigatedEvent();
    const eventClient = makeEventSearchClient({
      findByEventId: jest.fn().mockResolvedValue({ hits: [stored] }),
    });

    const newConfirmedRule: SignalEntry = {
      ...makeDetectionSignal('rule-2'),
      impact: 'blocked',
      metadata: {
        ...makeDetectionSignal('rule-2').metadata,
        severity_score: 90,
      },
    };

    await eventsWriteBulkHandler({
      eventSearchClient: eventClient,
      alertEventsClient,
      source: 'discovery',
      inputs: [
        {
          ...baseInput,
          event_id: stored.event_id,
          signals: [newConfirmedRule],
        },
      ],
    });

    expect(writtenDocs()[0].severity).toBe('critical');
  });
});

describe('eventsWriteBulkHandler — signal-less chat create', () => {
  it('stores an explicit severity when the write carries no signals', async () => {
    const eventClient = makeEventSearchClient();

    await eventsWriteBulkHandler({
      eventSearchClient: eventClient,
      alertEventsClient,
      inputs: [
        { ...baseInput, severity: 'critical', signals: [], causal_features: [], blast_radius: [] },
      ],
    });

    expect(writtenDocs()[0].severity).toBe('critical');
  });
});

describe('eventsWriteBulkHandler — narrative hijack guard', () => {
  type DetectionSignal = Extract<SignalEntry, { type: 'detection' }>;

  const makeDetectionSignal = (ruleUuid: string): DetectionSignal => ({
    type: 'detection',
    stream_name: 'logs.app',
    description: `Signal for ${ruleUuid}`,
    verdict: 'confirms',
    impact: 'degraded',
    metadata: {
      detection_id: `det-${ruleUuid}`,
      rule_uuid: ruleUuid,
      rule_name: ruleUuid,
      change_point_type: 'spike',
      p_value: 0.01,
    },
  });

  const makeCausal = (featureId: string): CausalFeature => ({
    feature_id: featureId,
    type: 'entity',
    subtype: 'service',
    name: featureId,
    stream_name: 'logs.app',
  });

  const makeSnapshotInput = (
    eventId: string,
    overrides: Partial<EventsWriteInput> = {}
  ): EventsWriteInput => ({
    ...baseInput,
    // Use a severity that differs from makeStoredEvent's 'high' default so the no-op guard
    // (shouldSkipAsNoOp) does not suppress writes in tests that are verifying the gate, not the
    // no-op. Tests specifically exercising the no-op interaction override this via `overrides`.
    severity: 'critical',
    event_id: eventId,
    signals: [makeDetectionSignal('rule-eis-auth')],
    causal_features: [],
    blast_radius: [],
    ...overrides,
  });

  const makeStoredEventWithRules = (
    eventId: string,
    ruleUuids: string[],
    topologyOverrides: {
      causal_features?: CausalFeature[];
      blast_radius?: BlastRadiusEntry[];
    } = {}
  ): SignificantEvent =>
    makeStoredEvent(eventId, {
      signals: ruleUuids.map((uuid) => makeDetectionSignal(uuid)),
      causal_features: topologyOverrides.causal_features ?? [],
      blast_radius: topologyOverrides.blast_radius ?? [],
    });

  it('narrative guard: preserves stored title and symptom_hypothesis when no new rules are introduced', async () => {
    const eventId = 'event-narrative-stable';
    const stored = makeStoredEventWithRules(eventId, ['rule-eis-auth'], {
      causal_features: [makeCausal('svc-eis')],
    });
    stored.title = 'EIS gateway — authorization endpoint HTTP errors';
    stored.symptom_hypothesis = 'EIS auth route returns >=400 for all clients.';

    const eventClient = makeEventSearchClient({
      findByEventId: jest.fn().mockResolvedValue({ hits: [stored] }),
    });

    const [result] = await eventsWriteBulkHandler({
      eventSearchClient: eventClient,
      alertEventsClient,
      inputs: [
        makeSnapshotInput(eventId, {
          signals: [makeDetectionSignal('rule-eis-auth')], // same rule — no new rules
          title: 'Agentless CEL state registry — cleanup remove 404 not_found', // attempted hijack
          symptom_hypothesis: 'CEL filebeat registry-remove 404s.', // attempted hijack
        }),
      ],
    });

    expect(result.written).toBe(true);
    if (result.written) {
      expect(result.narrative_preserved).toBe(true);
    }
    // Verify the stored values were written to ES, not the caller's hijack values
    const writtenDoc = writtenDocs()[0] as Partial<SignificantEvent>;
    expect(writtenDoc.title).toBe('EIS gateway — authorization endpoint HTTP errors');
    expect(writtenDoc.symptom_hypothesis).toBe('EIS auth route returns >=400 for all clients.');
  });
});

describe('eventsWriteBulkHandler — .rule-events writes', () => {
  it('calls createAlertEvent once per written document', async () => {
    await eventsWriteBulkHandler({
      eventSearchClient: makeEventSearchClient(),
      alertEventsClient,
      inputs: [
        { ...baseInput, event_id: 'event-a' },
        { ...baseInput, event_id: 'event-b' },
      ],
    });

    expect(alertEventsClient.createAlertEvent).toHaveBeenCalledTimes(2);
  });

  it('writes the toRuleEvent output of the in-memory document', async () => {
    await eventsWriteBulkHandler({
      eventSearchClient: makeEventSearchClient(),
      alertEventsClient,
      inputs: [{ ...baseInput, event_id: 'checkout__latency-abc12345' }],
    });

    expect(alertEventsClient.createAlertEvent).toHaveBeenCalledTimes(1);
    const [calledWith] = alertEventsClient.createAlertEvent.mock.calls[0];
    expect(calledWith).toMatchObject({
      fingerprint: 'checkout__latency-abc12345',
      alert_status: 'active',
    });
    expect(calledWith).toEqual(toRuleEvent(writtenDocs()[0]));
  });

  it('reports a per-item bulk_error and skips its trigger when createAlertEvent rejects', async () => {
    const emitTrigger = jest.fn();
    const logger = makeLogger();
    alertEventsClient.createAlertEvent.mockImplementation(async (event) => {
      if (event.fingerprint === 'event-b') {
        throw new Error('rule-events unavailable');
      }
      return undefined as never;
    });

    const results = await eventsWriteBulkHandler({
      eventSearchClient: makeEventSearchClient(),
      alertEventsClient,
      emitTrigger,
      logger,
      inputs: [
        { ...baseInput, event_id: 'event-a' },
        { ...baseInput, event_id: 'event-b' },
      ],
    });

    expect(results[0]).toMatchObject({ index: 0, written: true });
    expect(results[1]).toEqual({
      index: 1,
      event_id: 'event-b',
      status: 'active',
      written: false,
      reason: 'bulk_error',
      error: { type: 'rule_events_write_error', reason: 'rule-events unavailable' },
    });
    expect(emitTrigger).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('rule-events unavailable'));
  });

  it('emits eventCreated for a new event after its write succeeds', async () => {
    const emitTrigger = jest.fn();

    await eventsWriteBulkHandler({
      eventSearchClient: makeEventSearchClient(),
      alertEventsClient,
      emitTrigger,
      inputs: [{ ...baseInput, event_id: 'event-a' }],
    });

    expect(emitTrigger).toHaveBeenCalledWith(
      EVENT_CREATED_TRIGGER_ID,
      expect.objectContaining({ event_id: 'event-a' })
    );
  });

  it('keeps the single-item wrapper throwing on an item failure', async () => {
    alertEventsClient.createAlertEvent.mockRejectedValueOnce(new Error('bad'));

    await expect(
      eventsWriteHandler({
        eventSearchClient: makeEventSearchClient(),
        alertEventsClient,
        input: { ...baseInput, event_id: 'event-1' },
      })
    ).rejects.toThrow('rule_events_write_error: bad');
  });
});
