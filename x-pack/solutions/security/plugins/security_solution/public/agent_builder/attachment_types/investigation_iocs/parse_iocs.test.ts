/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CATEGORY_LABELS, parseIocCategoryRows } from './parse_iocs';
import { INVESTIGATION_IOC_CATEGORIES } from './types';

describe('parseIocCategoryRows', () => {
  it('returns a row with the label and items for a filled category', () => {
    const items = [{ value: '1.2.3.4', comment: 'C2 server' }, { value: '5.6.7.8' }];

    expect(parseIocCategoryRows({ ips: items })).toEqual([
      {
        id: 'ips',
        typeLabel: CATEGORY_LABELS.ips,
        items,
      },
    ]);
  });

  it('returns rows in category order regardless of payload key order', () => {
    const rows = parseIocCategoryRows({
      affected_hosts: [{ value: 'host-1' }],
      ips: [{ value: '1.2.3.4' }],
      shas: [{ value: 'abc' }],
    });

    expect(rows.map(({ id }) => id)).toEqual(['shas', 'ips', 'affected_hosts']);
  });

  it('supports every known category', () => {
    const data = Object.fromEntries(
      INVESTIGATION_IOC_CATEGORIES.map((category) => [category, [{ value: `${category}-value` }]])
    );

    const rows = parseIocCategoryRows(data);

    expect(rows.map(({ id }) => id)).toEqual([...INVESTIGATION_IOC_CATEGORIES]);
    rows.forEach(({ id, typeLabel }) => {
      expect(typeLabel).toBe(CATEGORY_LABELS[id]);
    });
  });

  it('ignores unknown keys such as attachmentLabel', () => {
    expect(
      parseIocCategoryRows({
        attachmentLabel: 'IOCs',
        unknown_category: [{ value: 'x' }],
        ips: [{ value: '1.2.3.4' }],
      }).map(({ id }) => id)
    ).toEqual(['ips']);
  });

  it('omits categories that are empty or missing', () => {
    expect(parseIocCategoryRows({ ips: [], shas: [{ value: 'abc' }] }).map(({ id }) => id)).toEqual(
      ['shas']
    );
  });

  it('returns an empty array when no categories are filled', () => {
    expect(parseIocCategoryRows({})).toEqual([]);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'ips'],
    ['a number', 1],
    ['a boolean', true],
    ['an array', [{ value: '1.2.3.4' }]],
  ])('returns an empty array when data is %s', (_label, data) => {
    expect(parseIocCategoryRows(data)).toEqual([]);
  });

  it.each([
    ['null', null],
    ['a string', '1.2.3.4'],
    ['a number', 5],
    ['an object', { value: '1.2.3.4' }],
  ])('drops a category whose value is %s rather than an array', (_label, value) => {
    expect(parseIocCategoryRows({ ips: value })).toEqual([]);
  });

  it('filters out invalid items and keeps valid ones', () => {
    const valid = { value: '1.2.3.4', comment: 'ok' };

    expect(
      parseIocCategoryRows({
        ips: [
          null,
          undefined,
          'string',
          42,
          {},
          { value: '' },
          { value: 123 },
          { value: null },
          { comment: 'no value' },
          valid,
        ],
      })
    ).toEqual([
      {
        id: 'ips',
        typeLabel: CATEGORY_LABELS.ips,
        items: [valid],
      },
    ]);
  });

  it('filters out items with a non-string comment', () => {
    const valid = { value: 'good', comment: 'fine' };

    expect(
      parseIocCategoryRows({
        ips: [
          { value: 'a', comment: 1 },
          { value: 'b', comment: null },
          { value: 'c', comment: {} },
          valid,
        ],
      })[0].items
    ).toEqual([valid]);
  });

  it('keeps items with an empty-string comment or no comment', () => {
    const items = [{ value: 'a', comment: '' }, { value: 'b' }];

    expect(parseIocCategoryRows({ ips: items })[0].items).toEqual(items);
  });

  it('drops a category when all of its items are invalid', () => {
    expect(
      parseIocCategoryRows({ ips: [{ value: '' }, null], shas: [{ value: 'abc' }] }).map(
        ({ id }) => id
      )
    ).toEqual(['shas']);
  });
});
