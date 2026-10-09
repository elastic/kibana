/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertEventsClientApi } from '@kbn/alerting-v2-plugin/server';
import { EVENT_STATUS_CHANGED_TRIGGER_ID } from '../../../../../common/workflows/triggers';
import type { LifecycleInput } from './lifecycle_state_machine';
import { applyLifecycleInput } from './lifecycle_controller';
import type { SignificantEvent } from '@kbn/significant-events-schema';

const createSignificantEvent = (overrides: Partial<SignificantEvent> = {}): SignificantEvent => ({
  '@timestamp': '2026-01-01T00:00:00.000Z',
  event_id: 'agent-event-1',
  status: 'active',
  stream_names: ['logs.test'],
  title: 'Test event',
  summary: 'Test summary',
  severity: 'medium',
  confidence: 0.8,
  ...overrides,
});

const makeAlertEventsClient = (
  overrides: Partial<jest.Mocked<AlertEventsClientApi>> = {}
): jest.Mocked<AlertEventsClientApi> =>
  ({
    createAlertEvent: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as jest.Mocked<AlertEventsClientApi>);

/** @param latest - the latest version returned by `findLatestByEventId`, if any. */
const createSearchClient = (latest?: SignificantEvent) => ({
  findLatestByEventId: jest.fn().mockResolvedValue(latest),
});

const DEACTIVATE: LifecycleInput = { kind: 'operator', intent: 'deactivate' };

const evaluation = (outcome: 'breaching' | 'clean' | 'no_data'): LifecycleInput => ({
  kind: 'evaluation',
  outcome,
});

const lastWritten = (client: jest.Mocked<AlertEventsClientApi>) =>
  client.createAlertEvent.mock.calls[0][0] as {
    alert_status: string;
    severity: string;
    data: Record<string, unknown>;
  };

describe('applyLifecycleInput', () => {
  it('writes a new version to .rule-events when status changes', async () => {
    const existing = createSignificantEvent({ status: 'active' });
    const alertEventsClient = makeAlertEventsClient();

    const result = await applyLifecycleInput({
      eventSearchClient: createSearchClient(existing) as never,
      eventId: existing.event_id,
      input: DEACTIVATE,
      alertEventsClient,
    });

    expect(result).toEqual({ updated: 1, ignored: 0, status: 'inactive' });
    expect(alertEventsClient.createAlertEvent).toHaveBeenCalledTimes(1);
    expect(lastWritten(alertEventsClient)).toMatchObject({
      fingerprint: existing.event_id,
      alert_status: 'inactive',
    });
  });

  it('records the given assessment note and keeps the stored one when the caller omits it', async () => {
    const existing = createSignificantEvent({ assessment_note: 'Operator dismissed as noise.' });

    const withNote = makeAlertEventsClient();
    await applyLifecycleInput({
      eventSearchClient: createSearchClient(existing) as never,
      eventId: existing.event_id,
      input: DEACTIVATE,
      assessmentNote: 'Automatically closed by cleanup.',
      alertEventsClient: withNote,
    });
    expect(lastWritten(withNote).data).toMatchObject({
      assessment_note: 'Automatically closed by cleanup.',
    });

    const withoutNote = makeAlertEventsClient();
    await applyLifecycleInput({
      eventSearchClient: createSearchClient(existing) as never,
      eventId: existing.event_id,
      input: DEACTIVATE,
      alertEventsClient: withoutNote,
    });
    expect(lastWritten(withoutNote).data).toMatchObject({
      assessment_note: 'Operator dismissed as noise.',
    });
  });

  it('ignores when the event is not found', async () => {
    const alertEventsClient = makeAlertEventsClient();

    const result = await applyLifecycleInput({
      eventSearchClient: createSearchClient() as never,
      eventId: 'missing-event',
      input: DEACTIVATE,
      alertEventsClient,
    });

    expect(result).toEqual({ updated: 0, ignored: 1, status: 'inactive', reason: 'not_found' });
    expect(alertEventsClient.createAlertEvent).not.toHaveBeenCalled();
  });

  it('ignores when the status is unchanged', async () => {
    const existing = createSignificantEvent({ status: 'inactive' });
    const alertEventsClient = makeAlertEventsClient();

    const result = await applyLifecycleInput({
      eventSearchClient: createSearchClient(existing) as never,
      eventId: existing.event_id,
      input: DEACTIVATE,
      alertEventsClient,
    });

    expect(result).toEqual({
      updated: 0,
      ignored: 1,
      status: 'inactive',
      reason: 'already_in_state',
    });
    expect(alertEventsClient.createAlertEvent).not.toHaveBeenCalled();
  });

  describe('status evaluations', () => {
    it.each<
      [string, Partial<SignificantEvent>, LifecycleInput, string, number | undefined, boolean]
    >([
      ['enters recovering with one evaluation', {}, evaluation('clean'), 'recovering', 1, false],
      [
        'advances the stored count, without a trigger',
        { status: 'recovering', status_evaluations: 1 },
        evaluation('clean'),
        'recovering',
        2,
        false,
      ],
      [
        'closes once the count is spent, clears it and emits a trigger',
        { status: 'recovering', status_evaluations: 3 },
        evaluation('clean'),
        'inactive',
        undefined,
        true,
      ],
      [
        'ignores a stale count on an active version, as a framework action leaves behind',
        { status: 'active', status_evaluations: 2 },
        evaluation('clean'),
        'recovering',
        1,
        false,
      ],
      [
        'clears the count when a breach returns',
        { status: 'recovering', status_evaluations: 2 },
        evaluation('breaching'),
        'active',
        undefined,
        false,
      ],
      [
        'clears the count when an operator deactivates',
        { status: 'recovering', status_evaluations: 2 },
        DEACTIVATE,
        'inactive',
        undefined,
        true,
      ],
    ])('%s', async (_label, state, input, status, count, triggers) => {
      const existing = createSignificantEvent(state);
      const alertEventsClient = makeAlertEventsClient();
      const emitTrigger = jest.fn();

      const result = await applyLifecycleInput({
        eventSearchClient: createSearchClient(existing) as never,
        eventId: existing.event_id,
        input,
        alertEventsClient,
        emitTrigger,
      });

      expect(result).toEqual({ updated: 1, ignored: 0, status });
      const { alert_status: written, data } = lastWritten(alertEventsClient);
      expect(written).toBe(status);
      if (count === undefined) {
        expect(data).not.toHaveProperty('status_evaluations');
      } else {
        expect(data).toMatchObject({ status_evaluations: count });
      }
      expect(emitTrigger).toHaveBeenCalledTimes(triggers ? 1 : 0);
    });

    it.each<[string, 'breaching' | 'no_data', string]>([
      ['still breaching', 'breaching', 'unchanged'],
      ['no data', 'no_data', 'no_data'],
    ])('writes nothing for an active series: %s', async (_label, outcome, reason) => {
      const existing = createSignificantEvent({ status: 'active' });
      const alertEventsClient = makeAlertEventsClient();

      const result = await applyLifecycleInput({
        eventSearchClient: createSearchClient(existing) as never,
        eventId: existing.event_id,
        input: evaluation(outcome),
        alertEventsClient,
      });

      expect(result).toEqual({ updated: 0, ignored: 1, status: 'active', reason });
      expect(alertEventsClient.createAlertEvent).not.toHaveBeenCalled();
    });

    it('writes only when the latest version is the one the caller read', async () => {
      const existing = createSignificantEvent({ status: 'active' });
      const stale = makeAlertEventsClient();

      const superseded = await applyLifecycleInput({
        eventSearchClient: createSearchClient(existing) as never,
        eventId: existing.event_id,
        input: evaluation('clean'),
        expectedTimestamp: '2000-01-01T00:00:00.000Z',
        alertEventsClient: stale,
      });
      expect(superseded).toEqual({
        updated: 0,
        ignored: 1,
        status: 'active',
        reason: 'superseded',
      });
      expect(stale.createAlertEvent).not.toHaveBeenCalled();

      const current = await applyLifecycleInput({
        eventSearchClient: createSearchClient(existing) as never,
        eventId: existing.event_id,
        input: evaluation('clean'),
        expectedTimestamp: existing['@timestamp'],
        alertEventsClient: makeAlertEventsClient(),
      });
      expect(current.updated).toBe(1);
    });
  });

  it('writes the given severity on the new version and keeps the stored one when omitted', async () => {
    const existing = createSignificantEvent({ status: 'recovering', severity: 'high' });

    const withSeverity = makeAlertEventsClient();
    await applyLifecycleInput({
      eventSearchClient: createSearchClient(existing) as never,
      eventId: existing.event_id,
      input: DEACTIVATE,
      severity: 'low',
      alertEventsClient: withSeverity,
    });
    expect(lastWritten(withSeverity)).toMatchObject({ severity: 'low' });

    const withoutSeverity = makeAlertEventsClient();
    await applyLifecycleInput({
      eventSearchClient: createSearchClient(existing) as never,
      eventId: existing.event_id,
      input: DEACTIVATE,
      alertEventsClient: withoutSeverity,
    });
    expect(lastWritten(withoutSeverity)).toMatchObject({ severity: 'high' });
  });

  it('emits a status-changed trigger after a successful write', async () => {
    const existing = createSignificantEvent({ status: 'active' });
    const emitTrigger = jest.fn();

    await applyLifecycleInput({
      eventSearchClient: createSearchClient(existing) as never,
      eventId: existing.event_id,
      input: DEACTIVATE,
      alertEventsClient: makeAlertEventsClient(),
      emitTrigger,
    });

    expect(emitTrigger).toHaveBeenCalledTimes(1);
    expect(emitTrigger).toHaveBeenCalledWith(
      EVENT_STATUS_CHANGED_TRIGGER_ID,
      expect.objectContaining({ event_id: existing.event_id, previous_status: 'active' })
    );
  });

  it('propagates the error and emits no trigger when createAlertEvent rejects', async () => {
    const existing = createSignificantEvent({ status: 'active' });
    const emitTrigger = jest.fn();
    const alertEventsClient = makeAlertEventsClient({
      createAlertEvent: jest.fn().mockRejectedValue(new Error('index unavailable')),
    });

    await expect(
      applyLifecycleInput({
        eventSearchClient: createSearchClient(existing) as never,
        eventId: existing.event_id,
        input: DEACTIVATE,
        alertEventsClient,
        emitTrigger,
      })
    ).rejects.toThrow('index unavailable');
    expect(emitTrigger).not.toHaveBeenCalled();
  });
});
