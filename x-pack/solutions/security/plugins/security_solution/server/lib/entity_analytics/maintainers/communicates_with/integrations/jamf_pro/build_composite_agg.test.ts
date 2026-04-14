/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  findBoolFilterWithHostExistsInShould,
  getBoolMinimumShouldMatch,
  isEventOutcomeTermFilter,
} from '../query_filter_test_utils';

import { buildCompositeAggQuery } from './build_composite_agg';

describe('communicates_with Jamf Pro buildCompositeAggQuery', () => {
  it('requires user.name to exist', () => {
    const query = buildCompositeAggQuery();
    expect(query.query.bool.filter).toContainEqual({ exists: { field: 'user.name' } });
  });

  it('requires at least one of host.name or host.id to exist', () => {
    const query = buildCompositeAggQuery();
    const filters = query.query.bool.filter as unknown[];
    const hostFilter = findBoolFilterWithHostExistsInShould(filters);
    expect(hostFilter).toBeDefined();
    expect(getBoolMinimumShouldMatch(hostFilter)).toBe(1);
  });

  it('does not filter on event.outcome', () => {
    const query = buildCompositeAggQuery();
    const filters = query.query.bool.filter as unknown[];
    const outcomeFilter = filters.find(isEventOutcomeTermFilter);
    expect(outcomeFilter).toBeUndefined();
  });

  it('passes afterKey to composite aggregation when provided', () => {
    const afterKey = { 'user.id': null, 'user.name': 'jane.doe', 'user.email': null };
    const query = buildCompositeAggQuery(afterKey);
    expect(query.aggs.users.composite.after).toEqual(afterKey);
  });
});
