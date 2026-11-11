/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSummary } from './build_summary';
import type { SseDetection } from './derive_detections';

const behaviorDetection = (overrides: Partial<SseDetection> = {}): SseDetection => ({
  id: 'behavior:T1059',
  kind: 'behavior',
  technique_id: 'T1059',
  technique_name: 'Command and Scripting Interpreter',
  basis: 'behavior_only',
  matched_on: [],
  total: 5,
  host_count: 2,
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

describe('buildSummary', () => {
  it('returns an empty string for no detections', () => {
    expect(buildSummary([])).toBe('');
  });

  it('builds a behavior summary with technique name, event count and host count', () => {
    expect(buildSummary([behaviorDetection()])).toBe(
      'T1059 Command and Scripting Interpreter: 5 events on 2 hosts'
    );
  });

  it('reads a truncated behavior host count as a floor', () => {
    expect(buildSummary([behaviorDetection({ host_count: 20, hosts_truncated: true })])).toBe(
      'T1059 Command and Scripting Interpreter: 5 events on 20+ hosts'
    );
  });

  it("builds an IOC summary with count and the IOC's own host count", () => {
    const summary = buildSummary([iocDetection({ host_count: 3 })]);
    expect(summary).toBe('ip 203.0.113.5 seen 8x on 3 hosts');
  });

  it('never credits one IOC with hosts another IOC matched', () => {
    const summary = buildSummary([
      iocDetection({ host_count: 1, total: 1 }),
      iocDetection({ id: 'ioc:ip:203.0.113.6', host_count: 99, total: 0 }),
    ]);
    expect(summary).toBe('ip 203.0.113.5 seen 1x on 1 host and 1 more');
  });

  it('falls back to just the technique id when technique_name is absent', () => {
    const detection = behaviorDetection();
    delete detection.technique_name;
    expect(buildSummary([detection])).toBe('T1059');
  });

  it('omits the host clause when the behavior host_count is unset', () => {
    const detection = behaviorDetection();
    delete detection.host_count;
    expect(buildSummary([detection])).toBe('T1059 Command and Scripting Interpreter: 5 events');
  });

  it('omits the host clause when the IOC host_count is unset', () => {
    const detection = iocDetection();
    delete detection.host_count;
    expect(buildSummary([detection])).toBe('ip 203.0.113.5 seen 8x');
  });

  it('leads with the scoped behavior detection when techniqueId is set, regardless of total', () => {
    const summary = buildSummary(
      [
        iocDetection({ total: 1000 }),
        behaviorDetection({ id: 'behavior:T1059', technique_id: 'T1059', total: 1 }),
      ],
      { techniqueId: 'T1059' }
    );
    expect(summary.startsWith('T1059 Command and Scripting Interpreter')).toBe(true);
    expect(summary.endsWith('and 1 more')).toBe(true);
  });

  it('ranks a strong IOC over a weak IOC, then by total, for a report-scoped multi-IOC summary', () => {
    const weak = iocDetection({
      id: 'ioc:ip:10.0.0.5',
      basis: 'ioc_weak',
      matched_on: [{ field: 'source.ip', value: '10.0.0.5' }],
      total: 50,
    });
    const strong = iocDetection({
      id: 'ioc:domain:evil.example.com',
      field: 'dns.question.name',
      basis: 'ioc_strong',
      matched_on: [{ field: 'dns.question.name', value: 'evil.example.com' }],
      total: 2,
    });
    const summary = buildSummary([weak, strong]);
    expect(summary).toBe('domain evil.example.com seen 2x and 1 more');
  });

  it('appends "and N more" for several detections', () => {
    const summary = buildSummary([
      behaviorDetection(),
      iocDetection(),
      iocDetection({
        id: 'ioc:ip:198.51.100.1',
        matched_on: [{ field: 'destination.ip', value: '198.51.100.1' }],
      }),
    ]);
    expect(summary.endsWith('and 2 more')).toBe(true);
  });

  it('never exceeds 512 characters', () => {
    const longName = 'x'.repeat(1000);
    const summary = buildSummary([behaviorDetection({ technique_name: longName })]);
    expect(summary.length).toBeLessThanOrEqual(512);
  });
});
