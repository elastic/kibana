/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLookupAliasName, getLookupIndexName, normalizeListId } from './get_lookup_index';
import { lookupAccessNameOf, lookupAliasOf, lookupIndexOf, lookupStorage } from './storage';

describe('lookup index naming', () => {
  it('normalizes a user supplied id to a legal index name', () => {
    expect(normalizeListId('Weird ID_With CAPS!')).toBe('weird-id_with-caps-');
    expect(normalizeListId('-leading')).toBe('leading');
  });

  it('rejects an id with no usable characters', () => {
    expect(() => normalizeListId('!!!')).toThrow('has no characters usable');
  });

  it('builds the concrete index and the alias from the same normalized id', () => {
    expect(getLookupIndexName('default', 'Corp Ranges')).toBe('.value-list-v2-default-corp-ranges');
    expect(getLookupAliasName('.items-default', 'Corp Ranges')).toBe('.items-default-corp-ranges');
  });

  it('maps case variants to the same names, which the create must reject', () => {
    expect(getLookupIndexName('default', 'abc')).toBe(getLookupIndexName('default', 'ABC'));
  });
});

describe('storage descriptor', () => {
  const index = '.value-list-v2-default-x';
  const alias = '.items-default-x';

  it('addresses a shared list by its alias', () => {
    const list = { storage: lookupStorage(index, alias) };
    expect(lookupIndexOf(list)).toBe(index);
    expect(lookupAliasOf(list)).toBe(alias);
    expect(lookupAccessNameOf(list)).toBe(alias);
  });

  it('addresses a restricted list by its concrete index', () => {
    const list = { storage: lookupStorage(index) };
    expect(lookupIndexOf(list)).toBe(index);
    expect(lookupAliasOf(list)).toBeUndefined();
    expect(lookupAccessNameOf(list)).toBe(index);
  });

  it('reads a list without a descriptor as legacy', () => {
    expect(lookupAccessNameOf({})).toBeUndefined();
  });
});
