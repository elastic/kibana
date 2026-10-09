/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseTimelineEvents } from './parse_timeline_events';

const validEvent = {
  timestamp: '2025-01-01T00:00:00.000Z',
  host: 'host-1',
  description: 'Process started',
};

describe('parseTimelineEvents', () => {
  it('returns all events when every event is valid', () => {
    const second = { ...validEvent, host: 'host-2', description: 'File created' };

    expect(parseTimelineEvents({ events: [validEvent, second] })).toEqual([validEvent, second]);
  });

  it('preserves event order', () => {
    const second = { ...validEvent, timestamp: '2025-01-02T00:00:00.000Z' };

    expect(parseTimelineEvents({ events: [second, validEvent] })).toEqual([second, validEvent]);
  });

  it('keeps extra properties on valid events', () => {
    const event = { ...validEvent, extra: 'value' };

    expect(parseTimelineEvents({ events: [event] })).toEqual([event]);
  });

  it('returns an empty array for an empty events array', () => {
    expect(parseTimelineEvents({ events: [] })).toEqual([]);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'events'],
    ['a number', 42],
    ['a boolean', true],
  ])('returns an empty array when data is %s', (_label, data) => {
    expect(parseTimelineEvents(data)).toEqual([]);
  });

  it('returns an empty array when data is an array', () => {
    expect(parseTimelineEvents([validEvent])).toEqual([]);
  });

  it('returns an empty array when events is missing', () => {
    expect(parseTimelineEvents({})).toEqual([]);
  });

  it.each([
    ['null', null],
    ['a string', 'nope'],
    ['an object', { 0: validEvent }],
    ['a number', 1],
  ])('returns an empty array when events is %s', (_label, events) => {
    expect(parseTimelineEvents({ events })).toEqual([]);
  });

  it.each(['timestamp', 'host', 'description'] as const)(
    'filters out events missing %s',
    (field) => {
      const { [field]: _omitted, ...incomplete } = validEvent;

      expect(parseTimelineEvents({ events: [incomplete, validEvent] })).toEqual([validEvent]);
    }
  );

  it.each(['timestamp', 'host', 'description'] as const)(
    'filters out events with an empty %s',
    (field) => {
      expect(parseTimelineEvents({ events: [{ ...validEvent, [field]: '' }, validEvent] })).toEqual(
        [validEvent]
      );
    }
  );

  it.each(['timestamp', 'host', 'description'] as const)(
    'filters out events with a non-string %s',
    (field) => {
      expect(
        parseTimelineEvents({
          events: [
            { ...validEvent, [field]: 123 },
            { ...validEvent, [field]: null },
            { ...validEvent, [field]: undefined },
            { ...validEvent, [field]: {} },
            validEvent,
          ],
        })
      ).toEqual([validEvent]);
    }
  );

  it('filters out non-object entries', () => {
    expect(
      parseTimelineEvents({ events: [null, undefined, 'event', 5, true, validEvent] })
    ).toEqual([validEvent]);
  });

  it('returns an empty array when no events are valid', () => {
    expect(parseTimelineEvents({ events: [{}, null, { host: 'h' }] })).toEqual([]);
  });
});
