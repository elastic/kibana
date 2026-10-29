/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventsFilters } from './events_filter_query';
import { toEventsFilterQuery } from './events_filter_query';

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
  it('omits empty arrays, empty search and a false unassigned flag', () => {
    expect(toEventsFilterQuery(emptyFilters)).toEqual({
      from: '2026-10-19T12:00:00.000Z',
      to: '2026-10-20T12:00:00.000Z',
      search: undefined,
      status: undefined,
      severity: undefined,
      investigation_state: undefined,
      topology_feature_id: undefined,
      unassigned_entities: undefined,
    });
  });

  it('maps each filter to its request param', () => {
    expect(
      toEventsFilterQuery({
        ...emptyFilters,
        search: 'checkout',
        status: ['active', 'recovering'],
        severity: ['critical', 'high'],
        investigation: ['in_progress'],
        entities: ['entity-1'],
        unassigned: true,
      })
    ).toEqual({
      from: '2026-10-19T12:00:00.000Z',
      to: '2026-10-20T12:00:00.000Z',
      search: 'checkout',
      status: ['active', 'recovering'],
      severity: ['critical', 'high'],
      investigation_state: ['in_progress'],
      topology_feature_id: ['entity-1'],
      unassigned_entities: true,
    });
  });
});
