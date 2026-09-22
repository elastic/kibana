/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEvent } from '@kbn/significant-events-schema';
import type { EventClient } from '../../lib/significant_events/events';
import {
  EVENT_CREATED_TRIGGER_ID,
  EVENT_STATUS_CHANGED_TRIGGER_ID,
} from '../../../common/workflows/triggers';
import { emitSignificantEventWriteTriggers } from './emit_significant_event_triggers';

const createEvent = (overrides: Partial<SignificantEvent> = {}): SignificantEvent => ({
  '@timestamp': '2026-01-01T00:00:00.000Z',
  event_uuid: 'event-uuid-1',
  event_id: 'event-id-1',
  status: 'open',
  stream_names: ['logs.test'],
  title: 'Test event',
  summary: 'Test summary',
  severity: '40-medium',
  confidence: 0.8,
  ...overrides,
});

const createEventClient = () => {
  const emitTrigger = jest.fn();
  const eventClient: Pick<EventClient, 'emitTrigger'> = { emitTrigger };
  return { eventClient, emitTrigger };
};

describe('emitSignificantEventWriteTriggers', () => {
  it('emits eventCreated when there is no prior version', () => {
    const { eventClient, emitTrigger } = createEventClient();
    const event = createEvent();

    emitSignificantEventWriteTriggers({
      eventClient,
      significantEvent: event,
      priorSignificantEvent: undefined,
    });

    expect(emitTrigger).toHaveBeenCalledTimes(1);
    expect(emitTrigger).toHaveBeenCalledWith(EVENT_CREATED_TRIGGER_ID, {
      event_id: 'event-id-1',
      event_uuid: 'event-uuid-1',
      title: 'Test event',
      summary: 'Test summary',
      status: 'open',
      severity: '40-medium',
      stream_names: ['logs.test'],
      occurred_at: '2026-01-01T00:00:00.000Z',
    });
  });

  it('emits eventStatusChanged with previous_status when the status differs', () => {
    const { eventClient, emitTrigger } = createEventClient();
    const event = createEvent({ status: 'closed' });

    emitSignificantEventWriteTriggers({
      eventClient,
      significantEvent: event,
      priorSignificantEvent: { status: 'open' },
    });

    expect(emitTrigger).toHaveBeenCalledTimes(1);
    expect(emitTrigger).toHaveBeenCalledWith(EVENT_STATUS_CHANGED_TRIGGER_ID, {
      event_id: 'event-id-1',
      event_uuid: 'event-uuid-1',
      title: 'Test event',
      summary: 'Test summary',
      status: 'closed',
      severity: '40-medium',
      stream_names: ['logs.test'],
      occurred_at: '2026-01-01T00:00:00.000Z',
      previous_status: 'open',
    });
  });

  it('emits nothing when a prior version exists with the same status', () => {
    const { eventClient, emitTrigger } = createEventClient();
    const event = createEvent({ status: 'open' });

    emitSignificantEventWriteTriggers({
      eventClient,
      significantEvent: event,
      priorSignificantEvent: { status: 'open' },
    });

    expect(emitTrigger).not.toHaveBeenCalled();
  });
});
