/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateAlertEventData } from '@kbn/alerting-v2-schemas';
import type { AlertEventsClientApi } from '@kbn/alerting-v2-plugin/server';
import type { SignalEntry, SignificantEvent } from '@kbn/significant-events-schema';
import { agentLifecycle } from './agent_lifecycle';
import {
  eventsWriteBulkHandler,
  type EventsWriteBulkResult,
  type EventsWriteInput,
} from './handler';

/**
 * Discovery's per-rule verdicts drive an event's status through the real write handler and the
 * state machine, against an in-memory event store: members turning healthy one by one, a breach
 * returning, and the event closed by someone else.
 */

const START = new Date('2026-10-08T12:00:00.000Z');
const STEP_MS = 15 * 60_000;

const detection = (rule: string, verdict: SignalEntry['verdict']): SignalEntry => ({
  type: 'detection',
  stream_name: 'logs',
  description: `${rule}: ${verdict}`,
  verdict,
  evidence: { esql_query: `FROM ${rule}`, result: verdict === 'confirms' ? 'found' : 'empty' },
  metadata: {
    detection_id: `det-${rule}-${verdict}`,
    rule_uuid: rule,
    rule_name: rule,
    change_point_type: verdict === 'confirms' ? 'spike' : 'dip',
    p_value: 0.01,
  },
});

const makeStore = () => {
  const versions: SignificantEvent[] = [];

  const byEvent = (eventId: string) => versions.filter((event) => event.event_id === eventId);
  const latestOf = (eventId: string) => byEvent(eventId).at(-1);
  const eventIds = () => [...new Set(versions.map((event) => event.event_id))];

  const eventSearchClient = {
    findByEventId: jest.fn(async (eventId: string) => ({ hits: byEvent(eventId) })),
    findLatestByEventId: jest.fn(async (eventId: string) => latestOf(eventId)),
    findLatestActive: jest.fn(async () => ({
      hits: eventIds()
        .map(latestOf)
        .filter(
          (event): event is SignificantEvent =>
            event !== undefined && (event.status === 'active' || event.status === 'recovering')
        ),
    })),
  };

  const alertEventsClient = {
    createAlertEvent: jest.fn(async (data: CreateAlertEventData) => {
      versions.push({
        ...(data.data as unknown as SignificantEvent),
        '@timestamp': data.timestamp as string,
        status: data.alert_status as SignificantEvent['status'],
        severity: data.severity as SignificantEvent['severity'],
      });
    }),
  } as unknown as jest.Mocked<AlertEventsClientApi>;

  const write = async (
    item: Pick<EventsWriteInput, 'signals'> & { event_id?: string }
  ): Promise<EventsWriteBulkResult> => {
    jest.setSystemTime(new Date(Date.now() + STEP_MS));
    const [result] = await eventsWriteBulkHandler({
      eventSearchClient: eventSearchClient as never,
      alertEventsClient,
      inputs: [
        {
          status: 'active',
          stream_names: ['logs'],
          title: 'Checkout failing',
          symptom_hypothesis: 'Checkout calls fail.',
          summary: 'Checkout calls fail.',
          severity: 'high',
          confidence: 0.8,
          causal_features: [],
          blast_radius: [],
          ...item,
        } as EventsWriteInput,
      ],
      resolveLifecycle: agentLifecycle,
    });
    return result;
  };

  /** Closes the event the way an operator, cleanup or the scheduled close workflow would. */
  const close = (eventId: string) => {
    const latest = latestOf(eventId);
    if (latest === undefined) throw new Error('no such event');
    jest.setSystemTime(new Date(Date.now() + STEP_MS));
    versions.push({ ...latest, '@timestamp': new Date().toISOString(), status: 'inactive' });
  };

  return {
    write,
    close,
    latestOf,
    eventIds,
    statuses: (eventId: string) => byEvent(eventId).map((event) => event.status),
    verdictOf: (eventId: string, rule: string) =>
      latestOf(eventId)?.signals?.find(
        (signal) => signal.type === 'detection' && signal.metadata.rule_uuid === rule
      )?.verdict,
  };
};

describe('discovery verdicts drive the event status', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: START });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('T0 to T20: stays active while a member breaches, starts recovering when every member is healthy', async () => {
    const store = makeStore();

    // T0: detection 1 and 2 both error.
    const opened = await store.write({
      signals: [detection('rule-1', 'confirms'), detection('rule-2', 'confirms')],
    });
    expect(opened).toMatchObject({ written: true, status: 'active' });
    const eventId = opened.event_id;

    // T15: detection 1 healthy, detection 2 still in error.
    const partial = await store.write({
      event_id: eventId,
      signals: [detection('rule-1', 'refutes')],
    });
    expect(partial).toMatchObject({ written: true, status: 'active' });
    expect(store.verdictOf(eventId, 'rule-1')).toBe('refutes');
    expect(store.verdictOf(eventId, 'rule-2')).toBe('confirms');

    // T20: detection 2 healthy too.
    const allHealthy = await store.write({
      event_id: eventId,
      signals: [detection('rule-2', 'refutes')],
    });
    expect(allHealthy).toMatchObject({ written: true, status: 'recovering' });
    expect(store.statuses(eventId)).toEqual(['active', 'active', 'recovering']);
  });

  it('stores a healthy verdict even when it changes neither status nor severity', async () => {
    const store = makeStore();
    const { event_id: eventId } = await store.write({
      signals: [detection('rule-1', 'confirms'), detection('rule-2', 'confirms')],
    });
    const versionsBefore = store.statuses(eventId).length;

    await store.write({ event_id: eventId, signals: [detection('rule-1', 'refutes')] });

    expect(store.statuses(eventId)).toHaveLength(versionsBefore + 1);
    expect(store.verdictOf(eventId, 'rule-1')).toBe('refutes');
  });

  it('writes nothing when the same verdicts are submitted again', async () => {
    const store = makeStore();
    const { event_id: eventId } = await store.write({
      signals: [detection('rule-1', 'confirms'), detection('rule-2', 'confirms')],
    });
    await store.write({ event_id: eventId, signals: [detection('rule-1', 'refutes')] });
    const versionsBefore = store.statuses(eventId).length;

    const repeat = await store.write({
      event_id: eventId,
      signals: [detection('rule-1', 'refutes')],
    });

    expect(repeat).toMatchObject({ written: false, reason: 'unchanged_outcome' });
    expect(store.statuses(eventId)).toHaveLength(versionsBefore);
  });

  it('a member breaching again while recovering returns the event to active and clears the count', async () => {
    const store = makeStore();
    const { event_id: eventId } = await store.write({
      signals: [detection('rule-1', 'confirms'), detection('rule-2', 'confirms')],
    });
    await store.write({
      event_id: eventId,
      signals: [detection('rule-1', 'refutes'), detection('rule-2', 'refutes')],
    });
    expect(store.latestOf(eventId)?.status).toBe('recovering');

    const rebreach = await store.write({
      event_id: eventId,
      signals: [detection('rule-2', 'confirms')],
    });

    expect(rebreach).toMatchObject({ written: true, status: 'active' });
  });

  it('a new member joining a recovering event, in error, returns it to active', async () => {
    const store = makeStore();
    const { event_id: eventId } = await store.write({
      signals: [detection('rule-1', 'confirms')],
    });
    await store.write({ event_id: eventId, signals: [detection('rule-1', 'refutes')] });
    expect(store.latestOf(eventId)?.status).toBe('recovering');

    await store.write({ event_id: eventId, signals: [detection('rule-3', 'confirms')] });

    expect(store.latestOf(eventId)?.status).toBe('active');
  });

  it('a member that cannot be judged holds the status', async () => {
    const store = makeStore();
    const { event_id: eventId } = await store.write({
      signals: [detection('rule-1', 'confirms'), detection('rule-2', 'confirms')],
    });
    await store.write({ event_id: eventId, signals: [detection('rule-1', 'refutes')] });

    await store.write({ event_id: eventId, signals: [detection('rule-2', 'inconclusive')] });

    expect(store.latestOf(eventId)?.status).toBe('active');
    expect(store.verdictOf(eventId, 'rule-2')).toBe('inconclusive');
  });

  it('never closes an event: closing is left to an operator, cleanup or a close workflow', async () => {
    const store = makeStore();
    const { event_id: eventId } = await store.write({
      signals: [detection('rule-1', 'confirms')],
    });

    for (let cycle = 0; cycle < 6; cycle++) {
      await store.write({ event_id: eventId, signals: [detection('rule-1', 'refutes')] });
    }

    expect(store.statuses(eventId)).not.toContain('inactive');
    expect(store.latestOf(eventId)?.status).toBe('recovering');
  });

  describe('T100: a detection arrives after the event was closed', () => {
    const closedEvent = async () => {
      const store = makeStore();
      const { event_id: eventId } = await store.write({
        signals: [detection('rule-1', 'confirms'), detection('rule-2', 'confirms')],
      });
      await store.write({
        event_id: eventId,
        signals: [detection('rule-1', 'refutes'), detection('rule-2', 'refutes')],
      });
      store.close(eventId);
      return { store, eventId };
    };

    it('a different rule in error opens a new event, not a third member of the closed one', async () => {
      const { store, eventId } = await closedEvent();

      const result = await store.write({ signals: [detection('rule-3', 'confirms')] });

      expect(result).toMatchObject({ written: true, status: 'active' });
      expect(result.event_id).not.toBe(eventId);
      expect(store.latestOf(eventId)?.status).toBe('inactive');
    });

    it('a member of the closed event breaching again reopens it', async () => {
      const { store, eventId } = await closedEvent();

      const result = await store.write({
        event_id: eventId,
        signals: [detection('rule-1', 'confirms')],
      });

      expect(result).toMatchObject({ written: true, status: 'active', event_id: eventId });
    });

    it('a healthy verdict for a closed event writes nothing', async () => {
      const { store, eventId } = await closedEvent();
      const versionsBefore = store.statuses(eventId).length;

      const result = await store.write({
        event_id: eventId,
        signals: [detection('rule-1', 'refutes')],
      });

      expect(result).toMatchObject({ written: false, skipped: true });
      expect(store.statuses(eventId)).toHaveLength(versionsBefore);
    });

    it('a healthy detection alone never creates an event', async () => {
      const store = makeStore();

      const result = await store.write({ signals: [detection('rule-9', 'refutes')] });

      expect(result).toMatchObject({ written: false, skipped: true });
      expect(store.eventIds()).toHaveLength(0);
    });
  });
});
