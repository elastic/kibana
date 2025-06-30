/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortSavedObjectsByField } from './monitor_config_utils';

describe('sortSavedObjectsByField', () => {
  it('sorts by string field asc', () => {
    const arr: any = [
      { attributes: { name: 'Charlie' } },
      { attributes: { name: 'alice' } },
      { attributes: { name: 'Bob' } },
    ];
    sortSavedObjectsByField(arr, 'name', 'asc');
    expect(arr.map((o: any) => o.attributes.name)).toEqual(['alice', 'Bob', 'Charlie']);
  });

  it('sorts by string field desc', () => {
    const arr: any = [
      { attributes: { name: 'Charlie' } },
      { attributes: { name: 'alice' } },
      { attributes: { name: 'Bob' } },
    ];
    sortSavedObjectsByField(arr, 'name', 'desc');
    expect(arr.map((o: any) => o.attributes.name)).toEqual(['Charlie', 'Bob', 'alice']);
  });

  it('handles null and undefined values', () => {
    const arr: any = [
      { attributes: { name: null } },
      { attributes: { name: 'Bob' } },
      { attributes: { name: undefined } },
      { attributes: { name: 'alice' } },
    ];
    sortSavedObjectsByField(arr, 'name', 'asc');
    expect(arr.map((o: any) => o.attributes.name)).toEqual([null, undefined, 'alice', 'Bob']);
  });

  it('sorts by number field', () => {
    const arr: any = [
      { attributes: { age: 30 } },
      { attributes: { age: 10 } },
      { attributes: { age: 20 } },
    ];
    sortSavedObjectsByField(arr, 'age', 'asc');
    expect(arr.map((o: any) => o.attributes.age)).toEqual([10, 20, 30]);
  });

  it('sorts by number field desc', () => {
    const arr: any = [
      { attributes: { age: 30 } },
      { attributes: { age: 10 } },
      { attributes: { age: 20 } },
    ];
    sortSavedObjectsByField(arr, 'age', 'desc');
    expect(arr.map((o: any) => o.attributes.age)).toEqual([30, 20, 10]);
  });

  it('handles .keyword suffix', () => {
    const arr: any = [
      { attributes: { name: 'Charlie' } },
      { attributes: { name: 'alice' } },
      { attributes: { name: 'Bob' } },
    ];
    sortSavedObjectsByField(arr, 'name.keyword', 'asc');
    expect(arr.map((o: any) => o.attributes.name)).toEqual(['alice', 'Bob', 'Charlie']);
  });
});
