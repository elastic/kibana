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

const assessment = (outcome: 'breaching' | 'clean' | 'no_data'): LifecycleInput => ({
  kind: 'assessment',
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

  describe('assessment', () => {
    it.each<
      [string, SignificantEvent['status'], 'breaching' | 'clean' | 'no_data', string, boolean]
    >([
      [
        'starts recovery silently when every member is healthy',
        'active',
        'clean',
        'recovering',
        false,
      ],
      [
        'returns a recovering event to active silently on a breach',
        'recovering',
        'breaching',
        'active',
        false,
      ],
      ['reopens a closed event on a breach and notifies', 'inactive', 'breaching', 'active', true],
    ])('%s', async (_label, current, outcome, status, triggers) => {
      const existing = createSignificantEvent({ status: current });
      const alertEventsClient = makeAlertEventsClient();
      const emitTrigger = jest.fn();

      const result = await applyLifecycleInput({
        eventSearchClient: createSearchClient(existing) as never,
        eventId: existing.event_id,
        input: assessment(outcome),
        alertEventsClient,
        emitTrigger,
      });

      expect(result).toEqual({ updated: 1, ignored: 0, status });
      expect(lastWritten(alertEventsClient).alert_status).toBe(status);
      expect(emitTrigger).toHaveBeenCalledTimes(triggers ? 1 : 0);
    });

    it.each<[string, SignificantEvent['status'], 'clean' | 'no_data']>([
      ['healthy members of a closed event', 'inactive', 'clean'],
      ['unjudged members of a closed event', 'inactive', 'no_data'],
    ])('writes nothing for %s', async (_label, current, outcome) => {
      const existing = createSignificantEvent({ status: current });
      const alertEventsClient = makeAlertEventsClient();

      const result = await applyLifecycleInput({
        eventSearchClient: createSearchClient(existing) as never,
        eventId: existing.event_id,
        input: assessment(outcome),
        alertEventsClient,
      });

      expect(result).toEqual({ updated: 0, ignored: 1, status: current, reason: 'not_a_breach' });
      expect(alertEventsClient.createAlertEvent).not.toHaveBeenCalled();
    });
  });

  it('writes only when the latest version is the one the caller read', async () => {
    const existing = createSignificantEvent({ status: 'active' });
    const stale = makeAlertEventsClient();

    const superseded = await applyLifecycleInput({
      eventSearchClient: createSearchClient(existing) as never,
      eventId: existing.event_id,
      input: DEACTIVATE,
      expectedTimestamp: '2000-01-01T00:00:00.000Z',
      alertEventsClient: stale,
    });
    expect(superseded).toEqual({ updated: 0, ignored: 1, status: 'active', reason: 'superseded' });
    expect(stale.createAlertEvent).not.toHaveBeenCalled();

    const current = await applyLifecycleInput({
      eventSearchClient: createSearchClient(existing) as never,
      eventId: existing.event_id,
      input: DEACTIVATE,
      expectedTimestamp: existing['@timestamp'],
      alertEventsClient: makeAlertEventsClient(),
    });
    expect(current.updated).toBe(1);
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
