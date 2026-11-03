/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '@kbn/entity-store/common';
import { buildEntitiesFilter, getMatchedEntityId } from './build_entities_filter';

jest.mock('@kbn/entity-store/common/euid_helpers', () => ({
  euid: {
    dsl: {
      getEuidFilterBasedOnEntityRecord: jest.fn(
        (_definition: unknown, record: { user?: { name?: string } }) =>
          record.user?.name ? { term: { 'user.name': record.user.name } } : undefined
      ),
    },
  },
  getBuiltInEntityDefinition: jest.fn((entityType: string) => ({ type: entityType })),
}));

const record = (name?: string, { withId = true }: { withId?: boolean } = {}): Entity =>
  ({
    entity: withId ? { id: `user:${name ?? 'unknown'}` } : undefined,
    user: name ? { name } : {},
  } as unknown as Entity);

const namedFilter = (name: string) => ({
  bool: { filter: [{ term: { 'user.name': name } }], _name: `user:${name}` },
});

describe('buildEntitiesFilter', () => {
  it('returns undefined when there are no records', () => {
    expect(buildEntitiesFilter('user', [])).toBeUndefined();
  });

  it('returns undefined when no record yields an identity filter', () => {
    expect(buildEntitiesFilter('user', [record()])).toBeUndefined();
  });

  it('returns the single filter unchanged and unnamed for one record', () => {
    expect(buildEntitiesFilter('user', [record('alice')])).toEqual({
      term: { 'user.name': 'alice' },
    });
  });

  it('ORs the named filters of several records and skips records without identity', () => {
    expect(buildEntitiesFilter('user', [record('alice'), record(), record('bob')])).toEqual({
      bool: {
        should: [namedFilter('alice'), namedFilter('bob')],
        minimum_should_match: 1,
      },
    });
  });

  it('keeps the query name when only an alias of a multi-record request has identity fields', () => {
    expect(buildEntitiesFilter('user', [record(), record('alias')])).toEqual({
      bool: {
        should: [namedFilter('alias')],
        minimum_should_match: 1,
      },
    });
  });

  it('leaves a record without entity id unnamed inside the OR', () => {
    expect(
      buildEntitiesFilter('user', [record('alice'), record('bob', { withId: false })])
    ).toEqual({
      bool: {
        should: [namedFilter('alice'), { term: { 'user.name': 'bob' } }],
        minimum_should_match: 1,
      },
    });
  });
});

describe('getMatchedEntityId', () => {
  const entityIds = ['user:target', 'user:alias-1', 'user:alias-2'];

  it('returns undefined when the hit has no matched queries', () => {
    expect(getMatchedEntityId(undefined, entityIds)).toBeUndefined();
    expect(getMatchedEntityId([], entityIds)).toBeUndefined();
  });

  it('returns the matched entity id', () => {
    expect(getMatchedEntityId(['user:alias-2'], entityIds)).toBe('user:alias-2');
  });

  it('prefers the earliest entity id when several records matched', () => {
    expect(getMatchedEntityId(['user:alias-2', 'user:alias-1'], entityIds)).toBe('user:alias-1');
    expect(getMatchedEntityId(['user:alias-1', 'user:target'], entityIds)).toBe('user:target');
  });

  it('ignores names that are not known entity ids', () => {
    expect(getMatchedEntityId(['something-else'], entityIds)).toBeUndefined();
  });

  it('accepts the scored object form of matched_queries', () => {
    expect(getMatchedEntityId({ 'user:alias-1': 1 }, entityIds)).toBe('user:alias-1');
  });
});
