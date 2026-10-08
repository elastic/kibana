/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEvent } from '@kbn/significant-events-schema';
import {
  EVENT_CREATED_TRIGGER_ID,
  EVENT_STATUS_CHANGED_TRIGGER_ID,
} from '../../../common/workflows/triggers';
import { emitSignificantEventWriteTriggers } from './emit_significant_event_triggers';

const createEvent = (overrides: Partial<SignificantEvent> = {}): SignificantEvent => ({
  '@timestamp': '2026-01-01T00:00:00.000Z',
  event_id: 'event-id-1',
  status: 'active',
  stream_names: ['logs.test'],
  title: 'Test event',
  summary: 'Test summary',
  severity: 'medium',
  confidence: 0.8,
  ...overrides,
});

describe('emitSignificantEventWriteTriggers', () => {
  it('emits eventCreated when there is no prior version', () => {
    const emitTrigger = jest.fn();
    const event = createEvent();

    emitSignificantEventWriteTriggers({
      emitTrigger,
      significantEvent: event,
      priorSignificantEvent: undefined,
    });

    expect(emitTrigger).toHaveBeenCalledTimes(1);
    expect(emitTrigger).toHaveBeenCalledWith(EVENT_CREATED_TRIGGER_ID, {
      event_id: 'event-id-1',
      title: 'Test event',
      summary: 'Test summary',
      status: 'active',
      severity: 'medium',
      stream_names: ['logs.test'],
      occurred_at: '2026-01-01T00:00:00.000Z',
    });
  });

  it('emits eventStatusChanged with previous_status when the status differs', () => {
    const emitTrigger = jest.fn();
    const event = createEvent({ status: 'inactive' });

    emitSignificantEventWriteTriggers({
      emitTrigger,
      significantEvent: event,
      priorSignificantEvent: { status: 'active' },
    });

    expect(emitTrigger).toHaveBeenCalledTimes(1);
    expect(emitTrigger).toHaveBeenCalledWith(EVENT_STATUS_CHANGED_TRIGGER_ID, {
      event_id: 'event-id-1',
      title: 'Test event',
      summary: 'Test summary',
      status: 'inactive',
      severity: 'medium',
      stream_names: ['logs.test'],
      occurred_at: '2026-01-01T00:00:00.000Z',
      previous_status: 'active',
    });
  });

  it('emits nothing when a prior version exists with the same status', () => {
    const emitTrigger = jest.fn();
    const event = createEvent({ status: 'active' });

    emitSignificantEventWriteTriggers({
      emitTrigger,
      significantEvent: event,
      priorSignificantEvent: { status: 'active' },
    });

    expect(emitTrigger).not.toHaveBeenCalled();
  });

  it.each<[string, SignificantEvent['status'], SignificantEvent['status']]>([
    ['active to recovering', 'active', 'recovering'],
    ['recovering back to active', 'recovering', 'active'],
  ])('emits nothing for %s: the event was never closed', (_label, previous, next) => {
    const emitTrigger = jest.fn();

    emitSignificantEventWriteTriggers({
      emitTrigger,
      significantEvent: createEvent({ status: next }),
      priorSignificantEvent: { status: previous },
    });

    expect(emitTrigger).not.toHaveBeenCalled();
  });

  it('reports a recovering event closing as active to inactive', () => {
    const emitTrigger = jest.fn();

    emitSignificantEventWriteTriggers({
      emitTrigger,
      significantEvent: createEvent({ status: 'inactive' }),
      priorSignificantEvent: { status: 'recovering' },
    });

    expect(emitTrigger).toHaveBeenCalledWith(
      EVENT_STATUS_CHANGED_TRIGGER_ID,
      expect.objectContaining({ status: 'inactive', previous_status: 'active' })
    );
  });
});
