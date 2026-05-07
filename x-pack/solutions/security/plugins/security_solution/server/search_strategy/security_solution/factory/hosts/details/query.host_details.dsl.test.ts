/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euid } from '@kbn/entity-store/common/euid_helpers';
import { buildHostDetailsQuery } from './query.host_details.dsl';
import { mockOptions, expectedDsl } from './__mocks__';

// Failing with rule registry enabled
describe('buildHostDetailsQuery', () => {
  test('build query from options correctly', () => {
    expect(buildHostDetailsQuery(mockOptions)).toEqual(expectedDsl);
  });

  test('includes host.name filter when filterQuery is undefined', () => {
    const result = buildHostDetailsQuery({ ...mockOptions, filterQuery: undefined });

    expect(result.query).toMatchSnapshot();
  });

  test('includes host.name filter when filterQuery is an empty object', () => {
    const result = buildHostDetailsQuery({ ...mockOptions, filterQuery: {} });

    const filters = (result.query as { bool: { filter: unknown[] } }).bool.filter;
    expect(filters).toContainEqual({ term: { 'host.name': mockOptions.hostName } });
  });

  test('uses filterQuery when defined', () => {
    const filterQuery = JSON.stringify({ term: { entity_id: 'some-entity-id' } });
    const result = buildHostDetailsQuery({ ...mockOptions, filterQuery });

    const filters = (result.query as { bool: { filter: unknown[] } }).bool.filter;
    expect(filters).toContainEqual({ term: { entity_id: 'some-entity-id' } });
    expect(filters).not.toContainEqual({ term: { 'host.name': mockOptions.hostName } });
  });

  test('includes EUID runtime mapping and documents filter when entityStoreV2 is enabled', () => {
    const result = buildHostDetailsQuery({ ...mockOptions, entityStoreV2: true });

    expect(result.runtime_mappings).toEqual({
      entity_id: euid.painless.getEuidRuntimeMapping('host'),
    });

    const filters = (result.query as { bool: { filter: unknown[] } }).bool.filter;
    expect(filters[0]).toEqual(euid.dsl.getEuidDocumentsContainsIdFilter('host'));
  });
});
