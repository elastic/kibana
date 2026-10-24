/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expandRumCcsIndices, expandRumEsqlFrom, normalizeSelectedRemoteClusters } from './rum_ccs';

const SOURCE = 'traces-*.otel-*,logs-*.otel-*';

describe('expandRumCcsIndices', () => {
  it('returns the local index when CCS is off', () => {
    expect(
      expandRumCcsIndices(SOURCE, {
        useAllRemoteClusters: false,
        selectedRemoteClusters: [],
      })
    ).toBe(SOURCE);
  });

  it('adds a wildcard remote when useAllRemoteClusters is true', () => {
    expect(
      expandRumCcsIndices(SOURCE, {
        useAllRemoteClusters: true,
        selectedRemoteClusters: [],
      })
    ).toBe(`${SOURCE},*:traces-*.otel-*,*:logs-*.otel-*`);
  });

  it('prefixes only connected selected clusters', () => {
    expect(
      expandRumCcsIndices('ux-rum-sessions-3', {
        useAllRemoteClusters: false,
        selectedRemoteClusters: ['ccs', 'down'],
        remoteClusters: [
          { name: 'ccs', isConnected: true },
          { name: 'down', isConnected: false },
        ],
      })
    ).toBe('ux-rum-sessions-3,ccs:ux-rum-sessions-3');
  });

  it('does not double-prefix already remote parts', () => {
    expect(
      expandRumCcsIndices('ux-rum-sessions-3,ccs:ux-rum-sessions-3', {
        useAllRemoteClusters: false,
        selectedRemoteClusters: ['ccs'],
      })
    ).toBe('ux-rum-sessions-3,ccs:ux-rum-sessions-3');
  });
});

describe('expandRumEsqlFrom', () => {
  it('expands the FROM clause', () => {
    expect(
      expandRumEsqlFrom('FROM traces-*.otel-*, logs-*.otel-*\n| STATS c = COUNT(*)', {
        useAllRemoteClusters: false,
        selectedRemoteClusters: ['ccs'],
      })
    ).toBe(
      'FROM traces-*.otel-*,logs-*.otel-*,ccs:traces-*.otel-*,ccs:logs-*.otel-*\n| STATS c = COUNT(*)'
    );
  });

  it('leaves queries without FROM unchanged', () => {
    expect(
      expandRumEsqlFrom('ROW a = 1', {
        useAllRemoteClusters: true,
        selectedRemoteClusters: [],
      })
    ).toBe('ROW a = 1');
  });
});

describe('normalizeSelectedRemoteClusters', () => {
  it('drops invalid names and caps the list', () => {
    expect(normalizeSelectedRemoteClusters(['ccs', 'bad name', 'ccs', 'ok_1'])).toEqual([
      'ccs',
      'ok_1',
    ]);
    expect(normalizeSelectedRemoteClusters('ccs')).toEqual([]);
  });
});
