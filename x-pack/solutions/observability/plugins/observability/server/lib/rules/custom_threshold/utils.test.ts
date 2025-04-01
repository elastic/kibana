/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flattenObject, getFormattedGroupBy, getGroupByObject } from './utils';

describe('FlattenObject', () => {
  it('flattens multi level item', () => {
    const data = {
      key1: {
        item1: 'value 1',
        item2: { itemA: 'value 2' },
      },
      key2: {
        item3: { itemA: { itemAB: 'value AB' } },
        item4: 'value 4',
      },
    };

    const flatten = flattenObject(data);
    expect(flatten).toEqual({
      'key2.item3.itemA.itemAB': 'value AB',
      'key2.item4': 'value 4',
      'key1.item1': 'value 1',
      'key1.item2.itemA': 'value 2',
    });
  });

  it('does not flatten an array item', () => {
    const data = {
      key1: {
        item1: 'value 1',
        item2: { itemA: 'value 2' },
      },
      key2: {
        item3: { itemA: { itemAB: 'value AB' } },
        item4: 'value 4',
        item5: [1],
        item6: { itemA: [1, 2, 3] },
      },
      key3: ['item7', 'item8'],
    };

    const flatten = flattenObject(data);
    expect(flatten).toEqual({
      key3: ['item7', 'item8'],
      'key2.item3.itemA.itemAB': 'value AB',
      'key2.item4': 'value 4',
      'key2.item5': [1],
      'key2.item6.itemA': [1, 2, 3],
      'key1.item1': 'value 1',
      'key1.item2.itemA': 'value 2',
    });
  });
});

describe('getFormattedGroupBy', () => {
  it('should format groupBy correctly for empty input', () => {
    expect(getFormattedGroupBy(undefined, new Set<string>())).toEqual({});
  });

  it('should format groupBy correctly for multiple groups', () => {
    expect(
      getFormattedGroupBy(
        ['host.name', 'host.mac', 'tags', 'container.name'],
        new Set([
          'host-0,00-00-5E-00-53-23,event-0,container-name',
          'host-0,00-00-5E-00-53-23,group-0,container-name',
          'host-0,00-00-5E-00-53-24,event-0,container-name',
          'host-0,00-00-5E-00-53-24,group-0,container-name',
        ])
      )
    ).toEqual({
      'host-0,00-00-5E-00-53-23,event-0,container-name': [
        { field: 'host.name', value: 'host-0' },
        { field: 'host.mac', value: '00-00-5E-00-53-23' },
        { field: 'tags', value: 'event-0' },
        { field: 'container.name', value: 'container-name' },
      ],
      'host-0,00-00-5E-00-53-23,group-0,container-name': [
        { field: 'host.name', value: 'host-0' },
        { field: 'host.mac', value: '00-00-5E-00-53-23' },
        { field: 'tags', value: 'group-0' },
        { field: 'container.name', value: 'container-name' },
      ],
      'host-0,00-00-5E-00-53-24,event-0,container-name': [
        { field: 'host.name', value: 'host-0' },
        { field: 'host.mac', value: '00-00-5E-00-53-24' },
        { field: 'tags', value: 'event-0' },
        { field: 'container.name', value: 'container-name' },
      ],
      'host-0,00-00-5E-00-53-24,group-0,container-name': [
        { field: 'host.name', value: 'host-0' },
        { field: 'host.mac', value: '00-00-5E-00-53-24' },
        { field: 'tags', value: 'group-0' },
        { field: 'container.name', value: 'container-name' },
      ],
    });
  });
});

describe('getGroupByObject', () => {
  it('should return empty object for undefined groupBy', () => {
    expect(getFormattedGroupBy(undefined, new Set<string>())).toEqual({});
  });

  it('should return an object containing groups for one groupBy field', () => {
    expect(getGroupByObject('host.name', new Set(['host-0', 'host-1']))).toEqual({
      'host-0': { host: { name: 'host-0' } },
      'host-1': { host: { name: 'host-1' } },
    });
  });

  it('should return an object containing groups for multiple groupBy fields', () => {
    expect(
      getGroupByObject(
        ['host.name', 'container.id'],
        new Set(['host-0,container-0', 'host-1,container-1'])
      )
    ).toEqual({
      'host-0,container-0': { container: { id: 'container-0' }, host: { name: 'host-0' } },
      'host-1,container-1': { container: { id: 'container-1' }, host: { name: 'host-1' } },
    });
  });
});
