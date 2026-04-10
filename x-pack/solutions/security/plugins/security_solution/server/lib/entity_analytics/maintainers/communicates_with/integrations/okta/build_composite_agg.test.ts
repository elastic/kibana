/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEventOutcomeTermFilter } from '../query_filter_test_utils';

import { buildCompositeAggQuery } from './build_composite_agg';
import { OKTA_AUTH_EVENT_ACTIONS } from './constants';

describe('communicates_with Okta buildCompositeAggQuery', () => {
  it('filters for auth event actions', () => {
    const query = buildCompositeAggQuery();
    expect(query.query.bool.filter).toContainEqual({
      terms: { 'event.action': OKTA_AUTH_EVENT_ACTIONS },
    });
  });

  it('requires okta.target.display_name to exist', () => {
    const query = buildCompositeAggQuery();
    expect(query.query.bool.filter).toContainEqual({
      exists: { field: 'okta.target.display_name' },
    });
  });

  it('does not filter on event.outcome', () => {
    const query = buildCompositeAggQuery();
    const filters = query.query.bool.filter as unknown[];
    const outcomeFilter = filters.find(isEventOutcomeTermFilter);
    expect(outcomeFilter).toBeUndefined();
  });

  it('passes afterKey to composite aggregation when provided', () => {
    const afterKey = { 'user.id': 'okta-user', 'user.name': null, 'user.email': null };
    const query = buildCompositeAggQuery(afterKey);
    expect(query.aggs.users.composite.after).toEqual(afterKey);
  });
});
