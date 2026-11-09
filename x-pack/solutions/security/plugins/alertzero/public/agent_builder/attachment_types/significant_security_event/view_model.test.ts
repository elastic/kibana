/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildSignificantSecurityEventHeadline,
  parseSignificantSecurityEventData,
  toSseViewModel,
} from './view_model';
import type { SignificantSecurityEventAttachmentData } from './view_model';

const baseParsed = {
  title: 'Suspicious lateral movement',
  severity: 'high' as const,
  confidence: 0.8,
  status: 'open' as const,
  source_watch: 'watch-1',
  capability: 'lateral-movement-detector',
  run_id: 'run-1',
  report_id: 'ti-report-1',
  security_knowledge_indicators: [],
  entities: [
    { field: 'user.name' as const, value: 'user-1' },
    { field: 'host.name' as const, value: 'host-1' },
    { field: 'host.name' as const, value: 'host-2' },
    { field: 'service.name' as const, value: 'svc-1' },
  ],
  hypothesis_tested: 'Attacker pivoted via RDP',
  evidence_for: [],
  evidence_against: [],
  evaluation_record_ref: 'eval-1',
};

const tier1OnlyHunt = {
  has_confirmed_hit: true,
  hit_sources: ['tier1' as const],
  time_range: { from: '2024-01-01T00:00:00Z', to: '2024-01-02T00:00:00Z' },
  tier1: {
    status: 'environment_hits_found' as const,
    counts: { total_hits: 12, returned_hits: 12, affected_hosts: 5, affected_users: 1 },
    per_index: [
      {
        index: '.ds-logs-endpoint.events.process-default-2026.09.22-000001',
        hit_count: 12,
        required: true,
      },
    ],
    resolved_iocs: [{ type: 'ip' as const, value: '127.0.0.1' }],
  },
};

const parseOrThrow = (data: unknown): SignificantSecurityEventAttachmentData => {
  const parsed = parseSignificantSecurityEventData(data);
  if (!parsed) {
    throw new Error('expected payload to parse');
  }
  return parsed;
};

describe('toSseViewModel', () => {
  it('keeps stored summary, basis and detections on a new payload', () => {
    const parsed = parseOrThrow({
      ...baseParsed,
      summary: 'ip 203.0.113.5 seen 3x on 2 hosts',
      basis: 'ioc_strong',
      detections: [
        {
          id: 'ioc:ip:203.0.113.5',
          kind: 'ioc',
          field: 'destination.ip',
          basis: 'ioc_strong',
          matched_on: [{ field: 'destination.ip', value: '203.0.113.5' }],
          total: 3,
        },
      ],
      hunt_result: tier1OnlyHunt,
    });

    const viewModel = toSseViewModel(parsed);
    expect(viewModel.summary).toBe('ip 203.0.113.5 seen 3x on 2 hosts');
    expect(viewModel.basis).toBe('ioc_strong');
    expect(viewModel.detections).toHaveLength(1);
    expect(viewModel.detections[0].id).toBe('ioc:ip:203.0.113.5');
    expect(viewModel.hypothesisDisplay).toBe('Attacker pivoted via RDP');
  });

  it('reconciles stored detection fields against cited events for Discover pivots', () => {
    const parsed = parseOrThrow({
      ...baseParsed,
      detections: [
        {
          id: 'ioc:ip:203.0.113.77',
          kind: 'ioc',
          field: 'source.ip',
          basis: 'ioc_strong',
          matched_on: [{ field: 'source.ip', value: '203.0.113.77' }],
          total: 2,
        },
      ],
      events: [
        {
          event_id: 'evt-1',
          source_index: '.ds-logs-endpoint.events.process-default-2026.09.22-000001',
          matched: {
            field: 'destination.ip',
            iocs: [{ type: 'ip', value: '203.0.113.77', field: 'destination.ip' }],
          },
        },
      ],
      hunt_result: tier1OnlyHunt,
    });

    expect(toSseViewModel(parsed).detections[0]).toMatchObject({
      field: 'destination.ip',
      matched_on: [{ field: 'destination.ip', value: '203.0.113.77' }],
    });
  });

  it('derives summary and detections for an old payload without them', () => {
    const parsed = parseOrThrow({
      ...baseParsed,
      events: [
        {
          event_id: 'evt-1',
          source_index: '.ds-logs-endpoint.events.process-default-2026.09.22-000001',
          host: 'host-1',
          matched: {
            ioc: { type: 'ip', value: '203.0.113.5' },
            field: 'destination.ip',
          },
        },
        {
          event_id: 'evt-2',
          source_index: '.ds-logs-endpoint.events.process-default-2026.09.22-000001',
          host: 'host-2',
          matched: {
            ioc: { type: 'ip', value: '203.0.113.5' },
            field: 'destination.ip',
          },
        },
      ],
      hunt_result: tier1OnlyHunt,
    });

    const viewModel = toSseViewModel(parsed);
    expect(viewModel.detections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'ioc:ip:203.0.113.5',
          kind: 'ioc',
          from_sample: true,
          total: 2,
        }),
      ])
    );
    expect(viewModel.summary).toContain('203.0.113.5');
    expect(viewModel.summary).toContain('seen 2x');
    // host-1 and host-2 on the cited events, not the report-wide 5 affected hosts.
    expect(viewModel.summary).toContain('on 2 hosts');
  });

  it('classifies a loopback IOC event as ioc_weak', () => {
    const parsed = parseOrThrow({
      ...baseParsed,
      events: [
        {
          event_id: 'evt-1',
          source_index: '.ds-logs-endpoint.events.process-default-2026.09.22-000001',
          matched: {
            ioc: { type: 'ip', value: '127.0.0.1' },
            field: 'source.ip',
          },
        },
      ],
      hunt_result: tier1OnlyHunt,
    });

    expect(toSseViewModel(parsed).basis).toBe('ioc_weak');
  });

  it('omits the basis for a Tier 1 hit whose IOC strength is unknown, instead of grading it weak', () => {
    const parsed = parseOrThrow({
      ...baseParsed,
      events: [],
      hunt_result: { ...tier1OnlyHunt, tier1: { ...tier1OnlyHunt.tier1, per_ioc: undefined } },
    });

    expect(toSseViewModel(parsed).basis).toBeUndefined();
  });

  it('falls back to hit_sources when no IOC event exists', () => {
    const behaviorOnly = parseOrThrow({
      ...baseParsed,
      events: [
        {
          event_id: 'evt-1',
          source_index: '.ds-logs-endpoint.events.process-default-2026.09.22-000001',
          matched: { technique_id: 'T1021', field: 'process.name' },
        },
      ],
      hunt_result: {
        ...tier1OnlyHunt,
        hit_sources: ['tier2'],
        tier1: {
          ...tier1OnlyHunt.tier1,
          status: 'no_environment_hits',
          counts: { total_hits: 0, returned_hits: 0, affected_hosts: 0, affected_users: 0 },
          per_index: [],
          resolved_iocs: [],
        },
        tier2: {
          status: 'behaviors_proposed',
          behaviors: [
            {
              technique_id: 'T1021',
              tactic_ids: ['TA0008'],
              confidence: 0.7,
              title: 'Lateral movement via RDP',
              execution: { executed: true, row_count: 4, hit: true },
            },
          ],
        },
      },
    });
    expect(toSseViewModel(behaviorOnly).basis).toBe('behavior_only');

    const mixed = parseOrThrow({
      ...baseParsed,
      events: [
        {
          event_id: 'evt-1',
          source_index: '.ds-logs-endpoint.events.process-default-2026.09.22-000001',
          matched: { technique_id: 'T1021', field: 'process.name' },
        },
      ],
      hunt_result: {
        ...tier1OnlyHunt,
        hit_sources: ['tier1', 'tier2'],
        tier2: {
          status: 'behaviors_proposed',
          behaviors: [
            {
              technique_id: 'T1021',
              tactic_ids: ['TA0008'],
              confidence: 0.7,
              title: 'Lateral movement via RDP',
              execution: { executed: true, row_count: 4, hit: true },
            },
          ],
        },
      },
    });
    expect(toSseViewModel(mixed).basis).toBe('ioc_and_behavior');
  });

  it('builds entity counts from entities versus tier1.counts, whichever is larger', () => {
    const parsed = parseOrThrow({
      ...baseParsed,
      hunt_result: tier1OnlyHunt,
    });

    const { entityLine } = toSseViewModel(parsed);
    // entities has 2 unique hosts; tier1 says 5 → 5 wins
    expect(entityLine.hostCount).toBe(5);
    // entities has 1 unique user; tier1 says 1 → 1
    expect(entityLine.userCount).toBe(1);
    expect(entityLine.entities.map((entity) => entity.field)).toEqual([
      'host.name',
      'host.name',
      'user.name',
      'service.name',
    ]);
  });

  it('groups events by detection, including an Other events bucket with old-payload M', () => {
    const parsed = parseOrThrow({
      ...baseParsed,
      events: [
        {
          event_id: 'evt-ioc',
          source_index: '.ds-logs-endpoint.events.process-default-2026.09.22-000001',
          matched: {
            ioc: { type: 'ip', value: '203.0.113.5' },
            field: 'destination.ip',
          },
        },
        {
          event_id: 'evt-other',
          source_index: '.ds-logs-endpoint.events.process-default-2026.09.22-000001',
        },
      ],
      hunt_result: tier1OnlyHunt,
    });

    const { eventGroups } = toSseViewModel(parsed);
    expect(eventGroups.map((group) => group.label)).toEqual(
      expect.arrayContaining(['ip 203.0.113.5', 'Other events'])
    );
    // Derived from-sample detection total is the cited event count; the
    // tier1.counts.total_hits fallback applies only when no detection exists.
    const iocGroup = eventGroups.find((group) => group.label === 'ip 203.0.113.5');
    expect(iocGroup?.total).toBe(1);
    expect(eventGroups.find((group) => group.label === 'Other events')?.events).toHaveLength(1);
  });
});

describe('buildSignificantSecurityEventHeadline', () => {
  it('uses summary as the title and exposes the basis badge', () => {
    const parsed = parseOrThrow({
      ...baseParsed,
      summary: 'ip 127.0.0.1 seen 4912x on 8 hosts',
      basis: 'ioc_weak',
      hunt_result: tier1OnlyHunt,
    });

    const headline = buildSignificantSecurityEventHeadline(parsed, undefined);
    expect(headline.title).toBe('ip 127.0.0.1 seen 4912x on 8 hosts');
    expect(headline.basisBadge).toEqual({ label: 'Weak IOC', color: 'hollow' });
    expect(headline.subtitle).toContain('ti-report-1');
  });

  it('derives the title from an old payload so chrome and inline share one headline', () => {
    const parsed = parseOrThrow({
      ...baseParsed,
      events: [
        {
          event_id: 'evt-1',
          source_index: '.ds-logs-endpoint.events.process-default-2026.09.22-000001',
          matched: {
            ioc: { type: 'ip', value: '127.0.0.1' },
            field: 'source.ip',
          },
        },
      ],
      hunt_result: tier1OnlyHunt,
    });

    const headline = buildSignificantSecurityEventHeadline(parsed, undefined);
    const viewModel = toSseViewModel(parsed);
    expect(headline.title).toBe(viewModel.summary);
    expect(headline.basisBadge?.label).toBe('Weak IOC');
  });
});
