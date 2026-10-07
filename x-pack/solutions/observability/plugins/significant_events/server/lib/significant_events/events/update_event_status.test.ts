/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_ASSESSMENT_NOTE_LENGTH,
  MAX_SUMMARY_LENGTH,
  MAX_SYMPTOM_HYPOTHESIS_LENGTH,
} from '@kbn/significant-events-schema';
import type { AlertEventsClientApi } from '@kbn/alerting-v2-plugin/server';
import { EVENT_STATUS_CHANGED_TRIGGER_ID } from '../../../../common/workflows/triggers';
import { updateSignificantEventStatus } from './update_event_status';
import type { SignificantEvent } from '@kbn/significant-events-schema';

const createSignificantEvent = (overrides: Partial<SignificantEvent> = {}): SignificantEvent => ({
  '@timestamp': '2026-01-01T00:00:00.000Z',
  event_id: 'agent-event-1',
  status: 'active',
  source_ids: ['logs.test'],
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

describe('updateSignificantEventStatus', () => {
  it('writes a new version to .rule-events when status changes', async () => {
    const existing = createSignificantEvent({ status: 'active' });
    const alertEventsClient = makeAlertEventsClient();

    const result = await updateSignificantEventStatus({
      eventSearchClient: createSearchClient(existing) as never,
      eventId: existing.event_id,
      status: 'inactive',
      alertEventsClient,
    });

    expect(result).toEqual({ updated: 1, ignored: 0, status: 'inactive' });
    expect(alertEventsClient.createAlertEvent).toHaveBeenCalledTimes(1);
    expect(alertEventsClient.createAlertEvent.mock.calls[0][0]).toMatchObject({
      fingerprint: existing.event_id,
      alert_status: 'inactive',
    });
  });

  it('updates the status of an event with longer narratives', async () => {
    const existing = createSignificantEvent({
      symptom_hypothesis: 'x'.repeat(MAX_SYMPTOM_HYPOTHESIS_LENGTH + 1),
      summary: 'x'.repeat(MAX_SUMMARY_LENGTH + 1),
      assessment_note: 'x'.repeat(MAX_ASSESSMENT_NOTE_LENGTH + 1),
    });
    const alertEventsClient = makeAlertEventsClient();

    await expect(
      updateSignificantEventStatus({
        eventSearchClient: createSearchClient(existing) as never,
        eventId: existing.event_id,
        status: 'inactive',
        alertEventsClient,
      })
    ).resolves.toMatchObject({ updated: 1, status: 'inactive' });

    expect(alertEventsClient.createAlertEvent).toHaveBeenCalledTimes(1);
  });

  it('records an assessment note with an automated status change', async () => {
    const existing = createSignificantEvent({ status: 'active' });
    const alertEventsClient = makeAlertEventsClient();

    await updateSignificantEventStatus({
      eventSearchClient: createSearchClient(existing) as never,
      eventId: existing.event_id,
      status: 'inactive',
      assessmentNote: 'Automatically closed by cleanup.',
      alertEventsClient,
    });

    const [ruleEvent] = alertEventsClient.createAlertEvent.mock.calls[0];
    expect(ruleEvent.data).toMatchObject({ assessment_note: 'Automatically closed by cleanup.' });
  });

  it('preserves an existing assessment note when the caller omits one', async () => {
    const existing = createSignificantEvent({
      status: 'active',
      assessment_note: 'Operator dismissed as noise.',
    });
    const alertEventsClient = makeAlertEventsClient();

    await updateSignificantEventStatus({
      eventSearchClient: createSearchClient(existing) as never,
      eventId: existing.event_id,
      status: 'inactive',
      alertEventsClient,
    });

    const [ruleEvent] = alertEventsClient.createAlertEvent.mock.calls[0];
    expect(ruleEvent.data).toMatchObject({ assessment_note: 'Operator dismissed as noise.' });
  });

  it('ignores when the event is not found', async () => {
    const alertEventsClient = makeAlertEventsClient();

    const result = await updateSignificantEventStatus({
      eventSearchClient: createSearchClient() as never,
      eventId: 'missing-event',
      status: 'inactive',
      alertEventsClient,
    });

    expect(result).toEqual({ updated: 0, ignored: 1, status: 'inactive' });
    expect(alertEventsClient.createAlertEvent).not.toHaveBeenCalled();
  });

  it('ignores when the status is unchanged', async () => {
    const existing = createSignificantEvent({ status: 'inactive' });
    const alertEventsClient = makeAlertEventsClient();

    const result = await updateSignificantEventStatus({
      eventSearchClient: createSearchClient(existing) as never,
      eventId: existing.event_id,
      status: 'inactive',
      alertEventsClient,
    });

    expect(result).toEqual({ updated: 0, ignored: 1, status: 'inactive' });
    expect(alertEventsClient.createAlertEvent).not.toHaveBeenCalled();
  });

  it('emits a status-changed trigger after a successful write', async () => {
    const existing = createSignificantEvent({ status: 'active' });
    const emitTrigger = jest.fn();

    await updateSignificantEventStatus({
      eventSearchClient: createSearchClient(existing) as never,
      eventId: existing.event_id,
      status: 'inactive',
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
      updateSignificantEventStatus({
        eventSearchClient: createSearchClient(existing) as never,
        eventId: existing.event_id,
        status: 'inactive',
        alertEventsClient,
        emitTrigger,
      })
    ).rejects.toThrow('index unavailable');
    expect(emitTrigger).not.toHaveBeenCalled();
  });
});
