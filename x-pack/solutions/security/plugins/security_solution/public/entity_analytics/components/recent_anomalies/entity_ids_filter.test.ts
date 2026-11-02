/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntityIdsFilter } from './entity_ids_filter';

describe('getEntityIdsFilter', () => {
  it('returns an empty string when entityIds is undefined (no active filter)', () => {
    expect(getEntityIdsFilter(undefined)).toBe('');
  });

  it('returns an empty string when entityIds is an empty array', () => {
    expect(getEntityIdsFilter([])).toBe('');
  });

  it('builds a WHERE entity_id IN clause for a single id', () => {
    expect(getEntityIdsFilter(['host:test_host_01'])).toBe(
      '| WHERE entity_id IN ("host:test_host_01") '
    );
  });

  it('builds a WHERE entity_id IN clause for multiple ids', () => {
    expect(getEntityIdsFilter(['host:a', 'user:b@local'])).toBe(
      '| WHERE entity_id IN ("host:a", "user:b@local") '
    );
  });

  it('escapes double quotes and backslashes in entity ids', () => {
    expect(getEntityIdsFilter(['host:weird"name', 'host:back\\slash'])).toBe(
      '| WHERE entity_id IN ("host:weird\\"name", "host:back\\\\slash") '
    );
  });
});
