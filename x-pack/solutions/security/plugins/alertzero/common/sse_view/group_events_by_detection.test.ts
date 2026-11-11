/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SseDetection, SseEventRef } from './derive_detections';
import { groupEventsByDetection } from './group_events_by_detection';

const buildEvent = (overrides: Partial<SseEventRef> = {}, id = 'evt'): SseEventRef => ({
  event_id: id,
  source_index: '.ds-logs-endpoint.events.process-default-000001',
  ...overrides,
});

const iocDetection = (overrides: Partial<SseDetection> = {}): SseDetection => ({
  id: 'ioc:ip:203.0.113.5',
  kind: 'ioc',
  field: 'destination.ip',
  basis: 'ioc_strong',
  matched_on: [{ field: 'destination.ip', value: '203.0.113.5' }],
  total: 8,
  ...overrides,
});

const behaviorDetection = (overrides: Partial<SseDetection> = {}): SseDetection => ({
  id: 'behavior:T1059',
  kind: 'behavior',
  technique_id: 'T1059',
  technique_name: 'Command and Scripting Interpreter',
  basis: 'behavior_only',
  matched_on: [],
  total: 5,
  ...overrides,
});

describe('groupEventsByDetection', () => {
  it('groups by an explicit matched.detection id', () => {
    const detection = iocDetection();
    const event = buildEvent({ matched: { detection: detection.id, field: 'destination.ip' } });

    const groups = groupEventsByDetection([event], [detection]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ detectionId: detection.id, total: 8, events: [event] });
  });

  it('groups by matched.ioc.value matching an IOC detection', () => {
    const detection = iocDetection();
    const event = buildEvent({
      matched: { ioc: { type: 'ip', value: '203.0.113.5' }, field: 'destination.ip' },
    });

    const groups = groupEventsByDetection([event], [detection]);

    expect(groups).toHaveLength(1);
    expect(groups[0].detectionId).toBe(detection.id);
    expect(groups[0].label).toBe('ip 203.0.113.5');
  });

  it('groups by matched.technique_id matching a behavior detection', () => {
    const detection = behaviorDetection();
    const event = buildEvent({ matched: { technique_id: 'T1059', field: 'event.action' } });

    const groups = groupEventsByDetection([event], [detection]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ detectionId: detection.id, total: 5 });
    expect(groups[0].label).toBe('T1059 Command and Scripting Interpreter');
  });

  it('buckets unmatched events as "Other events"', () => {
    const event = buildEvent();

    const groups = groupEventsByDetection([event], []);

    expect(groups).toEqual([{ label: 'Other events', events: [event] }]);
  });

  it('falls back to tier1.counts.total_hits for an IOC group with no detections array (old payload)', () => {
    const event = buildEvent({
      matched: { ioc: { type: 'ip', value: '203.0.113.5' }, field: 'destination.ip' },
    });

    const groups = groupEventsByDetection([event], [], { tier1: { counts: { total_hits: 42 } } });

    expect(groups).toHaveLength(1);
    expect(groups[0].detectionId).toBeUndefined();
    expect(groups[0].total).toBe(42);
  });

  it('falls back to execution.row_count for a behavior group with no detections array (old payload)', () => {
    const event = buildEvent({ matched: { technique_id: 'T1059', field: 'event.action' } });

    const groups = groupEventsByDetection([event], [], {
      tier2: { behaviors: [{ technique_id: 'T1059', execution: { row_count: 11 } }] },
    });

    expect(groups).toHaveLength(1);
    expect(groups[0].detectionId).toBeUndefined();
    expect(groups[0].total).toBe(11);
  });

  it('keeps every event from a matching group together, in order', () => {
    const detection = iocDetection();
    const first = buildEvent(
      { matched: { ioc: { type: 'ip', value: '203.0.113.5' }, field: 'destination.ip' } },
      'evt-1'
    );
    const second = buildEvent(
      { matched: { ioc: { type: 'ip', value: '203.0.113.5' }, field: 'destination.ip' } },
      'evt-2'
    );

    const groups = groupEventsByDetection([first, second], [detection]);

    expect(groups).toHaveLength(1);
    expect(groups[0].events).toEqual([first, second]);
  });
});
