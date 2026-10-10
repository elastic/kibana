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
  type SignificantEventInvestigation,
} from '@kbn/significant-events-schema';
import { attachInvestigationToEvent } from './attach_investigation';
import type { SignificantEvent } from '@kbn/significant-events-schema';

const createEvent = (overrides: Partial<SignificantEvent> = {}): SignificantEvent => ({
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

const createInvestigation = (
  overrides: Partial<SignificantEventInvestigation> = {}
): SignificantEventInvestigation => ({
  workflow_execution_id: 'exec-1',
  started_at: '2026-01-01T01:00:00.000Z',
  ...overrides,
});

const createClients = (latest?: SignificantEvent) => {
  const client = { findLatestByEventId: jest.fn().mockResolvedValue(latest) };
  const alertEventsClient = { createAlertEvent: jest.fn().mockResolvedValue(undefined) };
  return { client, alertEventsClient };
};

const getWritten = (alertEventsClient: {
  createAlertEvent: jest.Mock;
}): SignificantEvent & { investigations?: SignificantEventInvestigation[] } =>
  alertEventsClient.createAlertEvent.mock.calls[0][0].data;

describe('attachInvestigationToEvent', () => {
  it('rebuilds from the fresh head when another writer appended before the write', async () => {
    const stale = createEvent();
    const fresh = createEvent({ '@timestamp': '2026-01-01T00:05:00.000Z', status: 'recovering' });
    const { client, alertEventsClient } = createClients();
    client.findLatestByEventId
      .mockResolvedValueOnce(stale) // read
      .mockResolvedValueOnce(fresh) // pre-write head check: moved
      .mockResolvedValueOnce(fresh) // retry read
      .mockResolvedValueOnce(fresh); // retry head check: stable

    const result = await attachInvestigationToEvent({
      eventSearchClient: client as never,
      alertEventsClient: alertEventsClient as never,
      eventId: 'agent-event-1',
      investigation: createInvestigation(),
    });

    expect(result.updated).toBe(1);
    expect(alertEventsClient.createAlertEvent).toHaveBeenCalledTimes(1);
    expect(alertEventsClient.createAlertEvent.mock.calls[0][0].alert_status).toBe('recovering');
  });

  it('fails loudly when the head keeps moving', async () => {
    const { client, alertEventsClient } = createClients();
    let n = 0;
    client.findLatestByEventId.mockImplementation(async () =>
      createEvent({ '@timestamp': `2026-01-01T00:00:${String(n++).padStart(2, '0')}.000Z` })
    );

    await expect(
      attachInvestigationToEvent({
        eventSearchClient: client as never,
        alertEventsClient: alertEventsClient as never,
        eventId: 'agent-event-1',
        investigation: createInvestigation(),
      })
    ).rejects.toThrow('kept changing');
    expect(alertEventsClient.createAlertEvent).not.toHaveBeenCalled();
  });

  it('appends a new investigation entry and creates a new event version', async () => {
    const existing = createEvent();
    const { client, alertEventsClient } = createClients(existing);
    const investigation = createInvestigation();

    const result = await attachInvestigationToEvent({
      eventSearchClient: client as never,
      alertEventsClient: alertEventsClient as never,
      eventId: 'agent-event-1',
      investigation,
    });

    expect(result.updated).toBe(1);
    expect(result.ignored).toBe(0);

    const written = getWritten(alertEventsClient);

    expect(written.investigations).toEqual([investigation]);
    expect(written.workflow_execution_id).toBe(investigation.workflow_execution_id);
  });

  it('attaches an investigation to a legacy event with longer narratives', async () => {
    const existing = createEvent({
      symptom_hypothesis: 'x'.repeat(MAX_SYMPTOM_HYPOTHESIS_LENGTH + 1),
      summary: 'x'.repeat(MAX_SUMMARY_LENGTH + 1),
      assessment_note: 'x'.repeat(MAX_ASSESSMENT_NOTE_LENGTH + 1),
    });
    const { client, alertEventsClient } = createClients(existing);

    await expect(
      attachInvestigationToEvent({
        eventSearchClient: client as never,
        alertEventsClient: alertEventsClient as never,
        eventId: 'agent-event-1',
        investigation: createInvestigation(),
      })
    ).resolves.toMatchObject({ updated: 1 });

    expect(alertEventsClient.createAlertEvent).toHaveBeenCalledTimes(1);
  });

  it('replaces an existing entry with a completed one, preserving started_at', async () => {
    const pending = createInvestigation();
    const existing = createEvent({ investigations: [pending] });
    const { client, alertEventsClient } = createClients(existing);

    const terminal = createInvestigation({
      completed_at: '2026-01-01T02:00:00.000Z',
    });
    const result = await attachInvestigationToEvent({
      eventSearchClient: client as never,
      alertEventsClient: alertEventsClient as never,
      eventId: 'agent-event-1',
      investigation: terminal,
    });

    expect(result.updated).toBe(1);

    const written = getWritten(alertEventsClient);

    // Only one entry — replaced, not duplicated
    expect(written.investigations).toHaveLength(1);
    expect(written.investigations![0].started_at).toBe(pending.started_at);
    expect(written.investigations![0].completed_at).toBe('2026-01-01T02:00:00.000Z');
  });

  it('replaces by workflow_execution_id: different executions produce two entries', async () => {
    const first = createInvestigation({
      workflow_execution_id: 'exec-1',
      completed_at: '2026-01-01T01:30:00.000Z',
    });
    const existing = createEvent({ investigations: [first] });
    const { client, alertEventsClient } = createClients(existing);

    const second = createInvestigation({ workflow_execution_id: 'exec-2' });
    await attachInvestigationToEvent({
      eventSearchClient: client as never,
      alertEventsClient: alertEventsClient as never,
      eventId: 'agent-event-1',
      investigation: second,
    });

    const written = getWritten(alertEventsClient);

    expect(written.investigations).toHaveLength(2);
    expect(written.investigations![0].workflow_execution_id).toBe('exec-1');
    expect(written.investigations![1].workflow_execution_id).toBe('exec-2');
  });

  it('is idempotent: ignores when the entry is identical', async () => {
    const investigation = createInvestigation();
    const existing = createEvent({ investigations: [investigation] });
    const { client, alertEventsClient } = createClients(existing);

    const result = await attachInvestigationToEvent({
      eventSearchClient: client as never,
      alertEventsClient: alertEventsClient as never,
      eventId: 'agent-event-1',
      investigation,
    });

    expect(result.updated).toBe(0);
    expect(result.ignored).toBe(1);
    expect(alertEventsClient.createAlertEvent).not.toHaveBeenCalled();
  });

  it('returns ignored when the event is not found', async () => {
    const { client, alertEventsClient } = createClients();

    const result = await attachInvestigationToEvent({
      eventSearchClient: client as never,
      alertEventsClient: alertEventsClient as never,
      eventId: 'missing-event-id',
      investigation: createInvestigation(),
    });

    expect(result.updated).toBe(0);
    expect(result.ignored).toBe(1);
    expect(alertEventsClient.createAlertEvent).not.toHaveBeenCalled();
  });

  it('preserves the stable event_id when an investigation attaches', async () => {
    const existing = createEvent({
      event_id: 'agent-event-3',
    });
    const { client, alertEventsClient } = createClients(existing);

    const result = await attachInvestigationToEvent({
      eventSearchClient: client as never,
      alertEventsClient: alertEventsClient as never,
      eventId: 'agent-event-3',
      investigation: createInvestigation(),
    });

    expect(result.updated).toBe(1);
  });

  it('preserves other entries unchanged when a new execution attaches', async () => {
    const orphaned = createInvestigation({ workflow_execution_id: 'exec-1' });
    const existing = createEvent({ investigations: [orphaned] });
    const { client, alertEventsClient } = createClients(existing);

    const incoming = createInvestigation({ workflow_execution_id: 'exec-2' });
    const result = await attachInvestigationToEvent({
      eventSearchClient: client as never,
      alertEventsClient: alertEventsClient as never,
      eventId: 'agent-event-1',
      investigation: incoming,
    });

    expect(result.updated).toBe(1);

    const written = getWritten(alertEventsClient);

    expect(written.investigations).toHaveLength(2);
    expect(written.investigations![0].workflow_execution_id).toBe('exec-1');
    expect(written.investigations![0].completed_at).toBeUndefined();
    expect(written.investigations![1].workflow_execution_id).toBe('exec-2');
    expect(written.investigations![1].completed_at).toBeUndefined();
  });

  it('preserves other entries unchanged when a completed execution attaches', async () => {
    const orphaned = createInvestigation({ workflow_execution_id: 'exec-1' });
    const existing = createEvent({ investigations: [orphaned] });
    const { client, alertEventsClient } = createClients(existing);

    const terminal = createInvestigation({
      workflow_execution_id: 'exec-2',
      completed_at: '2026-01-01T02:00:00.000Z',
    });
    const result = await attachInvestigationToEvent({
      eventSearchClient: client as never,
      alertEventsClient: alertEventsClient as never,
      eventId: 'agent-event-1',
      investigation: terminal,
    });

    expect(result.updated).toBe(1);

    const written = getWritten(alertEventsClient);

    // Both entries present; exec-1 is preserved as-is (no completed_at stamping)
    expect(written.investigations).toHaveLength(2);
    expect(written.investigations![0].workflow_execution_id).toBe('exec-1');
    expect(written.investigations![0].completed_at).toBeUndefined();
    expect(written.investigations![1].workflow_execution_id).toBe('exec-2');
    expect(written.investigations![1].completed_at).toBe('2026-01-01T02:00:00.000Z');
  });

  it('does not exceed the 100-entry cap: ignores a new entry when already at 100 investigations', async () => {
    const fullInvestigations = Array.from({ length: 100 }, (_, i) =>
      createInvestigation({
        workflow_execution_id: `exec-${i}`,
        completed_at: '2026-01-01T01:30:00.000Z',
      })
    );
    const existing = createEvent({ investigations: fullInvestigations });
    const { client, alertEventsClient } = createClients(existing);

    const newInvestigation = createInvestigation({ workflow_execution_id: 'exec-100' });
    const result = await attachInvestigationToEvent({
      eventSearchClient: client as never,
      alertEventsClient: alertEventsClient as never,
      eventId: 'agent-event-1',
      investigation: newInvestigation,
    });

    expect(result.updated).toBe(0);
    expect(result.ignored).toBe(1);
    expect(alertEventsClient.createAlertEvent).not.toHaveBeenCalled();
  });

  it('resolves lineage: attach targets the latest event version for the given event_id', async () => {
    const pending = createInvestigation({ workflow_execution_id: 'exec-1' });
    const e1 = createEvent({
      event_id: 'slug-1',
      '@timestamp': '2026-01-01T00:01:00.000Z',
      investigations: [pending],
    });
    // findLatestByEventId returns the latest version of the lineage.
    const { client, alertEventsClient } = createClients(e1);

    const terminal = createInvestigation({
      workflow_execution_id: 'exec-1',
      completed_at: '2026-01-01T02:00:00.000Z',
    });
    const result = await attachInvestigationToEvent({
      eventSearchClient: client as never,
      alertEventsClient: alertEventsClient as never,
      eventId: 'slug-1',
      investigation: terminal,
    });

    expect(result.updated).toBe(1);

    const written = getWritten(alertEventsClient);

    // Replace-by-execution-id: pending entry replaced with terminal, not duplicated
    expect(written.investigations).toHaveLength(1);
    expect(written.investigations![0].started_at).toBe(pending.started_at);
    expect(written.investigations![0].completed_at).toBe('2026-01-01T02:00:00.000Z');
  });
});
