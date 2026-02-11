/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldSpec } from '@kbn/data-plugin/common';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { getTableTabItems } from './table_tab_items';

type TableItem = TimelineEventsDetailsItem & {
  valuesConcatenated: string;
  ariaRowindex: number;
} & Partial<FieldSpec>;

const buildItem = (
  overrides: Partial<TimelineEventsDetailsItem> = {}
): TimelineEventsDetailsItem => ({
  field: 'default.field',
  isObjectArray: false,
  ...overrides,
});

describe('getTableTabItems', () => {
  it('sorts items by field name', () => {
    const dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] = [
      buildItem({ field: 'z_field' }),
      buildItem({ field: 'a_field' }),
      buildItem({ field: 'm_field' }),
    ];

    const fieldsByName: { [fieldName: string]: Partial<FieldSpec> } = {};

    const result = getTableTabItems({
      dataFormattedForFieldBrowser,
      fieldsByName,
    }) as TableItem[];

    const fields = result.map((item) => item.field);
    expect(fields).toEqual(['a_field', 'm_field', 'z_field']);
  });

  it('merges matching FieldSpec properties from fieldsByName', () => {
    const dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] = [
      buildItem({ field: 'host.name', values: ['host-1'] }),
    ];

    const fieldsByName: { [fieldName: string]: Partial<FieldSpec> } = {
      'host.name': {
        type: 'string',
        searchable: true,
      },
    };

    const [item] = getTableTabItems({
      dataFormattedForFieldBrowser,
      fieldsByName,
    }) as TableItem[];

    // original props
    expect(item.field).toBe('host.name');
    expect(item.values).toEqual(['host-1']);

    // merged FieldSpec props
    expect(item.type).toBe('string');
    expect(item.searchable).toBe(true);
  });

  it('sets valuesConcatenated to joined values or empty string', () => {
    const dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] = [
      buildItem({ field: 'user.name', values: ['alice', 'bob'] }),
      buildItem({ field: 'no.values', values: undefined }),
    ];

    const fieldsByName: { [fieldName: string]: Partial<FieldSpec> } = {};

    const result = getTableTabItems({
      dataFormattedForFieldBrowser,
      fieldsByName,
    }) as TableItem[];

    const userName = result.find((item) => item.field === 'user.name')!;
    const noValues = result.find((item) => item.field === 'no.values')!;

    expect(userName.valuesConcatenated).toBe('alice,bob');
    expect(noValues.valuesConcatenated).toBe('');
  });

  it('sets ariaRowindex starting at 1 and incrementing after sort', () => {
    const dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] = [
      buildItem({ field: 'b_field' }),
      buildItem({ field: 'a_field' }),
      buildItem({ field: 'c_field' }),
    ];

    const fieldsByName: { [fieldName: string]: Partial<FieldSpec> } = {};

    const result = getTableTabItems({
      dataFormattedForFieldBrowser,
      fieldsByName,
    }) as TableItem[];

    // after sort: a_field, b_field, c_field
    expect(result[0].field).toBe('a_field');
    expect(result[0].ariaRowindex).toBe(1);

    expect(result[1].field).toBe('b_field');
    expect(result[1].ariaRowindex).toBe(2);

    expect(result[2].field).toBe('c_field');
    expect(result[2].ariaRowindex).toBe(3);
  });

  it('handles fields missing from fieldsByName without throwing', () => {
    const dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] = [
      buildItem({ field: 'known.field', values: ['1'] }),
      buildItem({ field: 'unknown.field', values: ['2'] }),
    ];

    const fieldsByName: { [fieldName: string]: Partial<FieldSpec> } = {
      'known.field': { type: 'number' },
    };

    const result = getTableTabItems({
      dataFormattedForFieldBrowser,
      fieldsByName,
    }) as TableItem[];

    const known = result.find((item) => item.field === 'known.field')!;
    const unknown = result.find((item) => item.field === 'unknown.field')!;

    expect(known.type).toBe('number');
    expect(unknown.field).toBe('unknown.field');
    // and it should still have valuesConcatenated
    expect(unknown.valuesConcatenated).toBe('2');
  });
});
