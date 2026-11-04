/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntForThreatHit } from '@kbn/alertzero-common';
import {
  deriveDetections,
  type DeriveDetectionsHuntResult,
  type SseEventRef,
} from './derive_detections';

const buildEvent = (overrides: Partial<SseEventRef> = {}): SseEventRef => ({
  event_id: 'evt-1',
  source_index: '.ds-logs-endpoint.events.process-default-000001',
  ...overrides,
});

describe('deriveDetections', () => {
  it('returns no detections when the hunt result is absent', () => {
    expect(deriveDetections(undefined, [])).toEqual([]);
  });

  it('builds one IOC detection per tier1.per_ioc entry', () => {
    const huntResult: DeriveDetectionsHuntResult = {
      tier1: {
        per_ioc: [
          {
            type: 'ip',
            value: '203.0.113.5',
            field: 'destination.ip',
            count: 8,
            host_count: 2,
            first_seen: '2026-01-01T00:00:00.000Z',
            last_seen: '2026-01-01T12:00:00.000Z',
          },
        ],
      },
    };

    const detections = deriveDetections(huntResult, []);

    expect(detections).toHaveLength(1);
    expect(detections[0]).toMatchObject({
      id: 'ioc:ip:203.0.113.5',
      kind: 'ioc',
      field: 'destination.ip',
      basis: 'ioc_strong',
      total: 8,
      host_count: 2,
      first_seen: '2026-01-01T00:00:00.000Z',
      last_seen: '2026-01-01T12:00:00.000Z',
    });
    expect(detections[0].from_sample).toBeUndefined();
  });

  it('borrows host/user names from matching events when per_ioc has no host_count', () => {
    const huntResult: DeriveDetectionsHuntResult = {
      tier1: {
        per_ioc: [{ type: 'ip', value: '203.0.113.5', field: 'destination.ip', count: 2 }],
      },
    };
    const events: SseEventRef[] = [
      buildEvent({
        host: 'host-a',
        user: 'alice',
        matched: { ioc: { type: 'ip', value: '203.0.113.5' }, field: 'destination.ip' },
      }),
      buildEvent({
        host: 'host-b',
        matched: { ioc: { type: 'ip', value: '203.0.113.5' }, field: 'destination.ip' },
      }),
    ];

    const detections = deriveDetections(huntResult, events);

    expect(detections[0].hosts).toEqual(['host-a', 'host-b']);
    expect(detections[0].users).toEqual(['alice']);
    expect(detections[0].host_count).toBe(2);
    expect(detections[0].user_count).toBe(1);
  });

  it('groups sampled hits by matched.iocs when tier1.per_ioc is absent', () => {
    const hits: HuntForThreatHit[] = [
      {
        id: 'h1',
        index: '.ds-logs-1',
        host: 'host-a',
        timestamp: '2026-01-01T00:00:00.000Z',
        matched: { iocs: [{ type: 'ip', value: '203.0.113.5', field: 'destination.ip' }] },
      },
      {
        id: 'h2',
        index: '.ds-logs-1',
        host: 'host-b',
        timestamp: '2026-01-01T01:00:00.000Z',
        matched: { iocs: [{ type: 'ip', value: '203.0.113.5', field: 'destination.ip' }] },
      },
    ];
    const huntResult: DeriveDetectionsHuntResult = { tier1: { hits } };

    const detections = deriveDetections(huntResult, []);

    expect(detections).toHaveLength(1);
    expect(detections[0]).toMatchObject({
      id: 'ioc:ip:203.0.113.5',
      kind: 'ioc',
      from_sample: true,
      total: 2,
      hosts: ['host-a', 'host-b'],
      first_seen: '2026-01-01T00:00:00.000Z',
      last_seen: '2026-01-01T01:00:00.000Z',
    });
  });

  it('falls back to matched.ioc/matched.field for hits with no matched.iocs array', () => {
    const hits: HuntForThreatHit[] = [
      {
        id: 'h1',
        index: '.ds-logs-1',
        host: 'host-a',
        matched: { ioc: { type: 'domain', value: 'evil.example.com' }, field: 'dns.question.name' },
      },
    ];
    const huntResult: DeriveDetectionsHuntResult = { tier1: { hits } };

    const detections = deriveDetections(huntResult, []);

    expect(detections).toHaveLength(1);
    expect(detections[0]).toMatchObject({
      id: 'ioc:domain:evil.example.com',
      field: 'dns.question.name',
      from_sample: true,
      total: 1,
    });
  });

  it('adds one behavior detection per executed-and-hit tier2 behavior, graded ioc_and_behavior when an IOC also matched', () => {
    const huntResult: DeriveDetectionsHuntResult = {
      tier1: {
        per_ioc: [{ type: 'ip', value: '203.0.113.5', field: 'destination.ip', count: 1 }],
      },
      tier2: {
        behaviors: [
          {
            technique_id: 'T1059',
            technique_name: 'Command and Scripting Interpreter',
            tactic_ids: ['TA0002'],
            confidence: 0.8,
            title: 'Suspicious interpreter use',
            execution: { executed: true, hit: true, row_count: 7 },
            affected_hosts: ['host-a', 'host-b'],
          },
        ],
      },
    };

    const detections = deriveDetections(huntResult, []);

    expect(detections).toHaveLength(2);
    const behaviorDetection = detections.find((d) => d.kind === 'behavior');
    expect(behaviorDetection).toMatchObject({
      id: 'behavior:T1059',
      technique_id: 'T1059',
      technique_name: 'Command and Scripting Interpreter',
      basis: 'ioc_and_behavior',
      total: 7,
      hosts: ['host-a', 'host-b'],
      host_count: 2,
    });
  });

  it('grades a behavior detection behavior_only when no IOC detection exists', () => {
    const huntResult: DeriveDetectionsHuntResult = {
      tier1: {},
      tier2: {
        behaviors: [
          {
            technique_id: 'T1059',
            tactic_ids: ['TA0002'],
            confidence: 0.8,
            title: 'Suspicious interpreter use',
            execution: { executed: true, hit: true, row_count: 3 },
          },
        ],
      },
    };

    const detections = deriveDetections(huntResult, []);

    expect(detections).toHaveLength(1);
    expect(detections[0].basis).toBe('behavior_only');
  });

  it('skips a behavior whose execution did not hit', () => {
    const huntResult: DeriveDetectionsHuntResult = {
      tier1: {},
      tier2: {
        behaviors: [
          {
            technique_id: 'T1059',
            tactic_ids: ['TA0002'],
            confidence: 0.8,
            title: 'Suspicious interpreter use',
            execution: { executed: true, hit: false, row_count: 0 },
          },
        ],
      },
    };

    expect(deriveDetections(huntResult, [])).toEqual([]);
  });

  it('scopes behavior detections to techniqueId when provided', () => {
    const huntResult: DeriveDetectionsHuntResult = {
      tier1: {},
      tier2: {
        behaviors: [
          {
            technique_id: 'T1059',
            tactic_ids: ['TA0002'],
            confidence: 0.8,
            title: 'a',
            execution: { executed: true, hit: true, row_count: 1 },
          },
          {
            technique_id: 'T1078',
            tactic_ids: ['TA0001'],
            confidence: 0.8,
            title: 'b',
            execution: { executed: true, hit: true, row_count: 2 },
          },
        ],
      },
    };

    const detections = deriveDetections(huntResult, [], { techniqueId: 'T1078' });

    expect(detections).toHaveLength(1);
    expect(detections[0].technique_id).toBe('T1078');
  });

  it('caps detections at 30', () => {
    const perIoc = Array.from({ length: 40 }, (_, i) => ({
      type: 'ip' as const,
      value: `203.0.113.${i}`,
      field: 'destination.ip',
      count: 1,
    }));
    const huntResult: DeriveDetectionsHuntResult = { tier1: { per_ioc: perIoc } };

    expect(deriveDetections(huntResult, [])).toHaveLength(30);
  });
});
