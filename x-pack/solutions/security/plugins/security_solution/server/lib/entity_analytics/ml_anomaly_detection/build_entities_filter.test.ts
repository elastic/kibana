/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '@kbn/entity-store/common';
import { buildEntitiesFilter } from './build_entities_filter';

jest.mock('@kbn/entity-store/common/euid_helpers', () => ({
  euid: {
    dsl: {
      getEuidFilterBasedOnEntityRecord: jest.fn(
        (_type: string, record: { user?: { name?: string } }) =>
          record.user?.name ? { term: { 'user.name': record.user.name } } : undefined
      ),
    },
  },
}));

const record = (name?: string): Entity =>
  ({
    entity: { id: `user:${name ?? 'unknown'}` },
    user: name ? { name } : {},
  } as unknown as Entity);

describe('buildEntitiesFilter', () => {
  it('returns undefined when there are no records', () => {
    expect(buildEntitiesFilter('user', [])).toBeUndefined();
  });

  it('returns undefined when no record yields an identity filter', () => {
    expect(buildEntitiesFilter('user', [record()])).toBeUndefined();
  });

  it('returns the single filter unchanged for one record', () => {
    expect(buildEntitiesFilter('user', [record('alice')])).toEqual({
      term: { 'user.name': 'alice' },
    });
  });

  it('ORs the filters of several records and skips records without identity', () => {
    expect(buildEntitiesFilter('user', [record('alice'), record(), record('bob')])).toEqual({
      bool: {
        should: [{ term: { 'user.name': 'alice' } }, { term: { 'user.name': 'bob' } }],
        minimum_should_match: 1,
      },
    });
  });
});
