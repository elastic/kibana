/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toEventsFilterQuery, type SignificantEventsFilters } from './events_filter_query';

const emptyFilters: SignificantEventsFilters = {
  from: '2026-10-19T12:00:00.000Z',
  to: '2026-10-20T12:00:00.000Z',
  search: '',
  status: [],
  severity: [],
  investigation: [],
  entities: [],
  unassigned: false,
};

describe('toEventsFilterQuery', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('maps each filter to its API query param', () => {
    expect(
      toEventsFilterQuery({
        ...emptyFilters,
        search: 'checkout',
        status: ['active', 'recovering'],
        severity: ['critical', 'high'],
        investigation: ['in_progress'],
        entities: ['feature-1', 'feature-2'],
        unassigned: true,
      })
    ).toEqual({
      from: '2026-10-19T12:00:00.000Z',
      to: '2026-10-20T12:00:00.000Z',
      search: 'checkout',
      status: ['active', 'recovering'],
      severity: ['critical', 'high'],
      investigation_state: ['in_progress'],
      topology_feature_id: ['feature-1', 'feature-2'],
      unassigned_entities: true,
    });
  });

  it('drops empty filters instead of sending empty values', () => {
    const query = toEventsFilterQuery(emptyFilters);

    expect(query.search).toBeUndefined();
    expect(query.status).toBeUndefined();
    expect(query.severity).toBeUndefined();
    expect(query.investigation_state).toBeUndefined();
    expect(query.topology_feature_id).toBeUndefined();
    expect(query.unassigned_entities).toBeUndefined();
  });

  it('resolves a relative time range to absolute timestamps', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-20T12:00:00.000Z'));

    const { from, to } = toEventsFilterQuery({ ...emptyFilters, from: 'now-24h', to: 'now' });

    expect(from).toBe('2026-10-19T12:00:00.000Z');
    expect(to).toBe('2026-10-20T12:00:00.000Z');
  });
});
