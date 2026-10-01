/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import {
  MAX_ASSESSMENT_NOTE_LENGTH,
  MAX_SUMMARY_LENGTH,
  MAX_SYMPTOM_HYPOTHESIS_LENGTH,
} from '@kbn/significant-events-schema';
import type { AlertEventsClientApi } from '@kbn/alerting-v2-plugin/server';
import type { Logger } from '@kbn/core/server';
import { updateSignificantEventStatus } from './update_event_status';
import { EventClient } from './event_client';
import type { SignificantEvent } from './data_stream';

const createSignificantEvent = (overrides: Partial<SignificantEvent> = {}): SignificantEvent => ({
  '@timestamp': '2026-01-01T00:00:00.000Z',
  event_uuid: 'event-1',
  event_id: 'agent-event-1',
  status: 'open',
  stream_names: ['logs.test'],
  title: 'Test event',
  summary: 'Test summary',
  severity: '40-medium',
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

const makeLogger = (): jest.Mocked<Logger> =>
  ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  } as unknown as jest.Mocked<Logger>);

/** @param hits - results returned for the single findByEventId esql query. */
const createEventClient = (hits: SignificantEvent[]) => {
  const okResponse = { errors: false, items: [] } as unknown as BulkResponse;
  const dataStreamClient = { create: jest.fn().mockResolvedValue(okResponse) };

  const queryMock = jest.fn().mockResolvedValue({
    columns: [{ name: '_source' }],
    values: hits.map((event) => [{ ...event }]),
  });

  const esClient = { esql: { query: queryMock } };
  const client = new EventClient({
    dataStreamClient: dataStreamClient as never,
    esClient: esClient as never,
    space: 'default',
  });
  return { client, dataStreamClient };
};

describe('updateSignificantEventStatus', () => {
  it('creates a new event version when status changes', async () => {
    const existing = createSignificantEvent({ event_uuid: 'event-1', status: 'open' });
    const { client, dataStreamClient } = createEventClient([existing]);

    const result = await updateSignificantEventStatus({
      eventClient: client,
      eventId: existing.event_id,
      status: 'closed',
      alertEventsClient: makeAlertEventsClient(),
      logger: makeLogger(),
    });

    expect(result).toEqual({
      event_uuid: result.event_uuid,
      updated: 1,
      ignored: 0,
      status: 'closed',
    });
    expect(result.event_uuid).not.toBe('event-1');

    const [[callArg]] = dataStreamClient.create.mock.calls;
    const written: SignificantEvent = callArg.documents[0];

    expect(written.status).toBe('closed');
    expect(written.previous_event_uuid).toBe('event-1');
    expect(written.event_uuid).not.toBe('event-1');
    expect(written).not.toHaveProperty('created_at');
    // Written with `refresh: 'wait_for'` so an immediate re-read (e.g. the UI's post-mutation
    // refetch) sees this version rather than resurfacing the previous one.
    expect(callArg.refresh).toBe('wait_for');
  });

  it('updates the status of a legacy event with longer narratives', async () => {
    const existing = createSignificantEvent({
      event_uuid: 'event-1',
      symptom_hypothesis: 'x'.repeat(MAX_SYMPTOM_HYPOTHESIS_LENGTH + 1),
      summary: 'x'.repeat(MAX_SUMMARY_LENGTH + 1),
      assessment_note: 'x'.repeat(MAX_ASSESSMENT_NOTE_LENGTH + 1),
    });
    const { client, dataStreamClient } = createEventClient([existing]);

    await expect(
      updateSignificantEventStatus({
        eventClient: client,
        eventId: existing.event_id,
        status: 'closed',
        alertEventsClient: makeAlertEventsClient(),
        logger: makeLogger(),
      })
    ).resolves.toMatchObject({ updated: 1, status: 'closed' });

    expect(dataStreamClient.create).toHaveBeenCalledTimes(1);
  });

  it('records an assessment note with an automated status change', async () => {
    const existing = createSignificantEvent({ event_uuid: 'event-1', status: 'open' });
    const { client, dataStreamClient } = createEventClient([existing]);

    await updateSignificantEventStatus({
      eventClient: client,
      eventId: existing.event_id,
      status: 'closed',
      assessmentNote: 'Automatically closed by cleanup.',
      alertEventsClient: makeAlertEventsClient(),
      logger: makeLogger(),
    });

    const [[callArg]] = dataStreamClient.create.mock.calls;
    expect(callArg.documents[0].assessment_note).toBe('Automatically closed by cleanup.');
  });

  it('preserves an existing assessment note when the caller omits one', async () => {
    const existing = createSignificantEvent({
      event_uuid: 'event-1',
      status: 'open',
      assessment_note: 'Operator dismissed as noise.',
    });
    const { client, dataStreamClient } = createEventClient([existing]);

    await updateSignificantEventStatus({
      eventClient: client,
      eventId: existing.event_id,
      status: 'closed',
      alertEventsClient: makeAlertEventsClient(),
      logger: makeLogger(),
    });

    const [[callArg]] = dataStreamClient.create.mock.calls;
    expect(callArg.documents[0].assessment_note).toBe('Operator dismissed as noise.');
  });

  it('ignores when the event is not found', async () => {
    const { client, dataStreamClient } = createEventClient([]);

    const result = await updateSignificantEventStatus({
      eventClient: client,
      eventId: 'missing-event',
      status: 'closed',
      alertEventsClient: makeAlertEventsClient(),
      logger: makeLogger(),
    });

    expect(result).toEqual({
      updated: 0,
      ignored: 1,
      status: 'closed',
    });
    expect(dataStreamClient.create).not.toHaveBeenCalled();
  });

  it('ignores when the status is unchanged', async () => {
    const existing = createSignificantEvent({ event_uuid: 'event-1', status: 'closed' });
    const { client, dataStreamClient } = createEventClient([existing]);

    const result = await updateSignificantEventStatus({
      eventClient: client,
      eventId: existing.event_id,
      status: 'closed',
      alertEventsClient: makeAlertEventsClient(),
      logger: makeLogger(),
    });

    expect(result).toEqual({ event_uuid: 'event-1', updated: 0, ignored: 1, status: 'closed' });
    expect(dataStreamClient.create).not.toHaveBeenCalled();
  });

  it('targets the latest version in the lineage when multiple versions exist, not the first', async () => {
    const e0 = createSignificantEvent({
      event_uuid: 'event-0',
      event_id: 'event-id-1',
      status: 'open',
    });
    const e1 = createSignificantEvent({
      event_uuid: 'event-1',
      event_id: 'event-id-1',
      previous_event_uuid: 'event-0',
      '@timestamp': '2026-01-01T00:01:00.000Z',
      status: 'dismissed',
    });
    // findByEventId returns the full lineage, ordered ascending by @timestamp.
    const { client, dataStreamClient } = createEventClient([e0, e1]);

    const result = await updateSignificantEventStatus({
      eventClient: client,
      eventId: 'event-id-1',
      status: 'closed',
      alertEventsClient: makeAlertEventsClient(),
      logger: makeLogger(),
    });

    expect(result.updated).toBe(1);

    const [[callArg]] = dataStreamClient.create.mock.calls;
    const written: SignificantEvent = callArg.documents[0];

    // Must chain off E1 (the latest lineage entry), not E0 (the first)
    expect(written.previous_event_uuid).toBe('event-1');
    expect(written.status).toBe('closed');
  });

  describe('dual-write to .rule-events (Writer 2)', () => {
    it('calls createAlertEvent once with the toRuleEvent output of the updated event', async () => {
      const existing = createSignificantEvent({ event_uuid: 'event-1', status: 'open' });
      const { client } = createEventClient([existing]);
      const alertEventsClient = makeAlertEventsClient();
      const logger = makeLogger();

      await updateSignificantEventStatus({
        eventClient: client,
        eventId: existing.event_id,
        status: 'closed',
        alertEventsClient,
        logger,
      });

      expect(alertEventsClient.createAlertEvent).toHaveBeenCalledTimes(1);
      const [calledWith] = alertEventsClient.createAlertEvent.mock.calls[0];
      // Verify the argument is the toRuleEvent output: must have fingerprint and alert_status
      expect(calledWith).toMatchObject({
        fingerprint: existing.event_id,
        alert_status: 'inactive', // 'closed' maps to inactive
      });
    });

    it('does not call createAlertEvent when no write occurs (status unchanged)', async () => {
      const existing = createSignificantEvent({ event_uuid: 'event-1', status: 'closed' });
      const { client } = createEventClient([existing]);
      const alertEventsClient = makeAlertEventsClient();

      await updateSignificantEventStatus({
        eventClient: client,
        eventId: existing.event_id,
        status: 'closed',
        alertEventsClient,
        logger: makeLogger(),
      });

      expect(alertEventsClient.createAlertEvent).not.toHaveBeenCalled();
    });

    it('does not call createAlertEvent when the event is not found', async () => {
      const { client } = createEventClient([]);
      const alertEventsClient = makeAlertEventsClient();

      await updateSignificantEventStatus({
        eventClient: client,
        eventId: 'missing-event',
        status: 'closed',
        alertEventsClient,
        logger: makeLogger(),
      });

      expect(alertEventsClient.createAlertEvent).not.toHaveBeenCalled();
    });

    it('returns success and logs error when createAlertEvent rejects (error suppression)', async () => {
      const existing = createSignificantEvent({ event_uuid: 'event-1', status: 'open' });
      const { client } = createEventClient([existing]);
      const alertEventsClient = makeAlertEventsClient({
        createAlertEvent: jest.fn().mockRejectedValue(new Error('index unavailable')),
      });
      const logger = makeLogger();

      // Writer still returns success despite .rule-events failure
      const result = await updateSignificantEventStatus({
        eventClient: client,
        eventId: existing.event_id,
        status: 'closed',
        alertEventsClient,
        logger,
      });

      expect(result).toMatchObject({ updated: 1, status: 'closed' });
      // Give the fire-and-forget promise a chance to settle (flush full microtask queue)
      await new Promise(setImmediate);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('index unavailable'));
    });
  });
});
