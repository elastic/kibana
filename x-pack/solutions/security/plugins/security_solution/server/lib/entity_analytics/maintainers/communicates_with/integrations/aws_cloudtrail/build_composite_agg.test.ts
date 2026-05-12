/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  findBoolFilterWithHostExistsInShould,
  isEventOutcomeTermFilter,
} from '../query_filter_test_utils';

import { buildCompositeAggQuery } from './build_composite_agg';
import { HUMAN_IAM_IDENTITY_TYPES } from './constants';

describe('communicates_with AWS CloudTrail buildCompositeAggQuery', () => {
  it('filters for human IAM identity types', () => {
    const query = buildCompositeAggQuery();
    expect(query.query.bool.filter).toContainEqual({
      terms: { 'aws.cloudtrail.user_identity.type': HUMAN_IAM_IDENTITY_TYPES },
    });
  });

  it('requires host.target.entity.id to exist', () => {
    const query = buildCompositeAggQuery();
    expect(query.query.bool.filter).toContainEqual({
      exists: { field: 'host.target.entity.id' },
    });
  });

  it('does not filter on event.outcome', () => {
    const query = buildCompositeAggQuery();
    const filters = query.query.bool.filter as unknown[];
    const outcomeFilter = filters.find(isEventOutcomeTermFilter);
    expect(outcomeFilter).toBeUndefined();
  });

  it('does not require host identity fields', () => {
    const query = buildCompositeAggQuery();
    const filters = query.query.bool.filter as unknown[];
    const hostFilter = findBoolFilterWithHostExistsInShould(filters);
    expect(hostFilter).toBeUndefined();
  });

  it('passes afterKey to composite aggregation when provided', () => {
    const afterKey = { 'user.id': 'test-user', 'user.name': null, 'user.email': null };
    const query = buildCompositeAggQuery(afterKey);
    expect(query.aggs.users.composite.after).toEqual(afterKey);
  });

  it('does not include after key when not provided', () => {
    const query = buildCompositeAggQuery();
    expect(query.aggs.users.composite.after).toBeUndefined();
  });
});
