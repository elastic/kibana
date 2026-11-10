/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildChevrons,
  buildDonutSegments,
  buildEntityGraph,
  buildSplit,
  buildTimelinePlot,
  formatGap,
} from './forensics_summary_charts';

describe('buildDonutSegments', () => {
  it('lays the arcs end to end around the whole circle, skipping empty parts', () => {
    const segments = buildDonutSegments([
      { className: 'a', count: 1 },
      { className: 'b', count: 0 },
      { className: 'c', count: 3 },
    ]);
    expect(segments).toEqual([
      { className: 'a', dashArray: '31.41 125.66', dashOffset: '0.00' },
      { className: 'c', dashArray: '94.25 125.66', dashOffset: '-31.41' },
    ]);
  });

  it('draws no arc when there is nothing to count', () => {
    expect(buildDonutSegments([{ className: 'a', count: 0 }])).toEqual([]);
  });
});

describe('buildSplit', () => {
  it('gives each part with a count its share in percent', () => {
    expect(
      buildSplit([
        { className: 'a', count: 1 },
        { className: 'b', count: 2 },
        { className: 'c', count: 0 },
      ])
    ).toEqual([
      { className: 'a', width: 33.3 },
      { className: 'b', width: 66.7 },
    ]);
  });
});

describe('buildChevrons', () => {
  it('notches every chevron but the first into the one before it', () => {
    const [first, second] = buildChevrons([
      { name: 'Reconnaissance', short: 'Recon', detected: false },
      { name: 'Execution', short: 'Execution', detected: true },
    ]);
    expect(first.points).toBe('0,0 46,0 52,15 46,30 0,30');
    expect(second).toEqual({
      name: 'Execution',
      short: 'Execution',
      on: true,
      points: '52,0 98,0 104,15 98,30 52,30 58,15',
      labelX: 81,
    });
  });
});

describe('buildTimelinePlot', () => {
  const events = [
    { timestamp: '2026-11-02T08:00:00Z', description: 'first' },
    { timestamp: 'not a time', description: 'unplaced' },
    { timestamp: '2026-11-02T08:10:00Z', description: 'last' },
  ];

  it('places events on the padded axis, keeping their list numbers, and labels the gaps', () => {
    const plot = buildTimelinePlot(events, []);
    expect(plot?.events.map(({ x, number }) => [x, number])).toEqual([
      [119, 1],
      [669, 3],
    ]);
    expect(plot?.gaps).toEqual([{ x: 394, label: '+10m' }]);
    expect(plot).toMatchObject({ start: '08:00:00', end: '08:10:00', spanMinutes: 10 });
  });

  it('plots only the alerts inside the axis', () => {
    const plot = buildTimelinePlot(events, [
      { timestamp: '2026-11-02T08:05:00Z', severity: 'high', ruleName: 'inside' },
      { timestamp: '2026-11-02T09:00:00Z', severity: 'low', ruleName: 'after' },
      { severity: 'low', ruleName: 'untimed' },
    ]);
    expect(plot?.alerts).toEqual([{ x: 394, severity: 'high', title: 'inside' }]);
  });

  it('has no plot when no event time parses', () => {
    expect(buildTimelinePlot([{ timestamp: 'x', description: 'y' }], [])).toBeUndefined();
  });
});

describe('formatGap', () => {
  it('uses the largest whole unit', () => {
    expect([formatGap(42), formatGap(600), formatGap(7200)]).toEqual(['+42s', '+10m', '+2h']);
  });
});

describe('buildEntityGraph', () => {
  it('puts identities left and up to three destinations right, leaving out the host itself', () => {
    const graph = buildEntityGraph({
      host: 'win-fin-07',
      identities: ['FIN\\jdoe'],
      ips: ['203.0.113.7', '198.51.100.20', '192.0.2.1'],
      hosts: ['win-fin-07', 'fs01.corp.local', 'dc01.corp.local'],
    });
    expect(graph.left.map(({ value, y }) => [value, y])).toEqual([['FIN\\jdoe', 85]]);
    expect(graph.right.map(({ value, kind, label, y }) => [value, kind, label, y])).toEqual([
      ['203.0.113.7', 'IP', '203.0.113.7', 35],
      ['198.51.100.20', 'IP', '198.51.100.20', 85],
      ['fs01.corp.local', 'HOST', 'fs01', 135],
    ]);
    expect(graph.empty).toBe(false);
  });

  it('says the host is unknown and has nothing to link when nothing was extracted', () => {
    expect(buildEntityGraph({ identities: [], ips: [], hosts: [] })).toEqual({
      host: 'host unknown',
      left: [],
      right: [],
      empty: true,
    });
  });
});
