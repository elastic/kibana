/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import { addLookupAlias, removeLookupAlias } from './create_lookup_index';
import { deleteLookupIndex } from './delete_lookup_index';
import { assertLookupAccessName, assertLookupNames } from './get_lookup_index';
import {
  assertStorageDescriptor,
  lookupAccessNameOf,
  lookupIndexOf,
  readStorageDescriptor,
} from './storage';
import type { ListStorageSource } from './storage';

const LIST_ID = 'my-list';
const SPACE = 'default';
const ITEMS = '.items-default';
const INDEX = '.value-list-v2-default-my-list';
const ALIAS = '.items-default-my-list';
const lookup = (index: string, alias?: string): ListStorageSource => ({
  id: LIST_ID,
  storage: {
    locator: alias != null ? { alias, index } : { index },
    type: 'lookup_index' as const,
  },
});

// The names read from a list's storage descriptor are handed to the internal client for
// index deletion, alias changes, mapping upgrades, and the coalesce task. Only the
// `storage` field supplies them, and only when its names are the ones derived from the
// space and the list id, because a list user can write the field directly in Elasticsearch.
describe('storage descriptor', () => {
  it('reads a lookup list from its storage field', () => {
    const list = lookup(INDEX, ALIAS);
    expect(lookupIndexOf(list)).toBe(INDEX);
    expect(lookupAccessNameOf(list)).toBe(ALIAS);
  });

  it('reads a list without a storage field as a legacy data stream list', () => {
    expect(readStorageDescriptor({ id: LIST_ID })).toEqual({ type: 'data_stream' });
    expect(readStorageDescriptor({ id: LIST_ID, storage: null })).toEqual({ type: 'data_stream' });
    expect(lookupIndexOf({ id: LIST_ID })).toBeUndefined();
  });

  it('ignores a descriptor stashed in meta, which any list writer can set', () => {
    const list = {
      id: LIST_ID,
      meta: { __vlStorage: { locator: { index: '.kibana-victim' }, type: 'lookup_index' } },
    };
    expect(readStorageDescriptor(list)).toEqual({ type: 'data_stream' });
    expect(lookupIndexOf(list)).toBeUndefined();
  });
});

describe('assertStorageDescriptor', () => {
  const check = (list: Parameters<typeof assertStorageDescriptor>[0]['list']): void =>
    assertStorageDescriptor({ list, listItemIndex: ITEMS, spaceId: SPACE });

  it('accepts the names the space derives from the list id, shared or restricted', () => {
    expect(() => check(lookup(INDEX, ALIAS))).not.toThrow();
    expect(() => check(lookup(INDEX))).not.toThrow();
    expect(() =>
      check({
        id: 'My List',
        storage: lookup('.value-list-v2-default-my-list', '.items-default-my-list').storage,
      })
    ).not.toThrow();
  });

  it('accepts a legacy list, which has nothing to check', () => {
    expect(() => check({ id: LIST_ID })).not.toThrow();
  });

  it.each([
    ["another space's index", '.value-list-v2-other-space-my-list', undefined],
    ["another list's index in this space", '.value-list-v2-default-other-list', undefined],
    ['a system index', '.kibana', undefined],
    ["another list's alias", INDEX, '.items-default-other-list'],
    ["another space's alias", INDEX, '.items-other-space-my-list'],
  ])('refuses a descriptor naming %s', (_label, index, alias) => {
    expect(() => check(lookup(index, alias))).toThrow('was not written by the lists plugin');
  });
});

describe('assertLookupNames', () => {
  it('accepts the names this module builds', () => {
    expect(() => assertLookupNames({ alias: ALIAS, index: INDEX })).not.toThrow();
    expect(() => assertLookupNames({ index: INDEX })).not.toThrow();
  });

  it.each([
    ['another prefix', '.kibana-victim'],
    ['the alias prefix as an index', ALIAS],
    ['a list of names', `${INDEX},.value-list-v2-default-other`],
    ['a wildcard', '.value-list-v2-default-*'],
    ['whitespace', `${INDEX} x`],
  ])('refuses an index name with %s', (_label, index) => {
    expect(() => assertLookupNames({ index })).toThrow('is not a value list lookup index name');
  });

  it.each([
    ['another prefix', '.kibana'],
    ['a wildcard', '.items-default-*'],
    ['a list of names', `${ALIAS},.items-default`],
  ])('refuses an alias name with %s', (_label, alias) => {
    expect(() => assertLookupNames({ alias, index: INDEX })).toThrow(
      'is not a value list alias name'
    );
  });
});

describe('assertLookupAccessName', () => {
  it('accepts a concrete index or an alias, and nothing else', () => {
    expect(() => assertLookupAccessName(INDEX)).not.toThrow();
    expect(() => assertLookupAccessName(ALIAS)).not.toThrow();
    for (const name of ['.kibana', '.items-*', `${ALIAS},${INDEX}`, 'logs-*', '.lists-default']) {
      expect(() => assertLookupAccessName(name)).toThrow('is not a value list index or alias name');
    }
  });
});

describe('provisioning helpers refuse foreign names before touching Elasticsearch', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();

  beforeEach(() => jest.clearAllMocks());

  it('deleteLookupIndex', async () => {
    await expect(deleteLookupIndex({ esClient, index: '.kibana-victim' })).rejects.toThrow(
      'is not a value list lookup index name'
    );
    expect(esClient.indices.delete).not.toHaveBeenCalled();
  });

  it('deleteLookupIndex tolerates a missing index and raises anything else', async () => {
    esClient.indices.delete.mockRejectedValueOnce({ meta: { statusCode: 404 } });
    await expect(deleteLookupIndex({ esClient, index: INDEX })).resolves.toBeUndefined();
    esClient.indices.delete.mockRejectedValueOnce({ meta: { statusCode: 403 } });
    await expect(deleteLookupIndex({ esClient, index: INDEX })).rejects.toEqual({
      meta: { statusCode: 403 },
    });
    expect(esClient.indices.delete).toHaveBeenCalledWith({ index: INDEX });
  });

  it('addLookupAlias and removeLookupAlias', async () => {
    await expect(
      addLookupAlias({ alias: ALIAS, esClient, index: '.kibana-victim' })
    ).rejects.toThrow('is not a value list lookup index name');
    await expect(removeLookupAlias({ alias: '.kibana', esClient, index: INDEX })).rejects.toThrow(
      'is not a value list alias name'
    );
    expect(esClient.indices.updateAliases).not.toHaveBeenCalled();
    expect(esClient.indices.exists).not.toHaveBeenCalled();
  });
});
