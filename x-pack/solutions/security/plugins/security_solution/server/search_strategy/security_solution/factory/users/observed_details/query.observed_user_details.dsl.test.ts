/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euid } from '@kbn/entity-store/common/euid_helpers';
import { buildObservedUserDetailsQuery } from './query.observed_user_details.dsl';
import { mockOptions } from './__mocks__';

describe('buildUserDetailsQuery', () => {
  test('build query from options correctly', () => {
    expect(buildObservedUserDetailsQuery(mockOptions)).toMatchSnapshot();
  });

  test('includes user.name filter when filterQuery is undefined', () => {
    const result = buildObservedUserDetailsQuery({ ...mockOptions, filterQuery: undefined });

    expect(result.query).toMatchSnapshot();
  });

  test('includes user.name filter when filterQuery is an empty object', () => {
    const result = buildObservedUserDetailsQuery({ ...mockOptions, filterQuery: {} });

    const filters = (result.query as { bool: { filter: unknown[] } }).bool.filter;
    expect(filters).toContainEqual({ term: { 'user.name': mockOptions.userName } });
  });

  test('uses filterQuery when defined', () => {
    const filterQuery = JSON.stringify({ term: { entity_id: 'some-entity-id' } });
    const result = buildObservedUserDetailsQuery({ ...mockOptions, filterQuery });

    const filters = (result.query as { bool: { filter: unknown[] } }).bool.filter;
    expect(filters).toContainEqual({ term: { entity_id: 'some-entity-id' } });
    expect(filters).not.toContainEqual({ term: { 'user.name': mockOptions.userName } });
  });

  test('includes EUID runtime mapping and documents filter when entityStoreV2 is enabled', () => {
    const result = buildObservedUserDetailsQuery({ ...mockOptions, entityStoreV2: true });

    expect(result.runtime_mappings).toEqual({
      entity_id: euid.painless.getEuidRuntimeMapping('user'),
    });

    const filters = (result.query as { bool: { filter: unknown[] } }).bool.filter;
    expect(filters[0]).toEqual(euid.dsl.getEuidDocumentsContainsIdFilter('user'));
  });
});
