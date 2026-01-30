/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dateSuffixesBetween, episodeIndexNames } from './indexing';

describe('dateSuffixesBetween', () => {
  it('returns all UTC day suffixes inclusively across the range', () => {
    const startMs = Date.parse('2026-01-14T00:00:00.000Z');
    const endMs = Date.parse('2026-01-16T23:59:59.999Z');

    expect(dateSuffixesBetween(startMs, endMs)).toEqual(['2026.01.14', '2026.01.15', '2026.01.16']);
  });

  it('returns one suffix when start and end are on the same UTC day', () => {
    const startMs = Date.parse('2026-01-14T01:02:03.000Z');
    const endMs = Date.parse('2026-01-14T23:59:59.999Z');

    expect(dateSuffixesBetween(startMs, endMs)).toEqual(['2026.01.14']);
  });

  it('throws when end is before start', () => {
    const startMs = Date.parse('2026-01-15T00:00:00.000Z');
    const endMs = Date.parse('2026-01-14T00:00:00.000Z');

    expect(() => dateSuffixesBetween(startMs, endMs)).toThrow();
  });
});

describe('episodeIndexNames', () => {
  it('returns ep index names using a provided date suffix override', () => {
    const names = episodeIndexNames({
      episodeId: 'ep1',
      endMs: Date.parse('2026-01-01T00:00:00.000Z'),
      indexPrefix: 'logs-endpoint',
      dateSuffixOverride: '2026.01.14',
    });

    expect(names.endpointEvents).toEqual('logs-endpoint.events.insights.ep1.2026.01.14');
  });
});
