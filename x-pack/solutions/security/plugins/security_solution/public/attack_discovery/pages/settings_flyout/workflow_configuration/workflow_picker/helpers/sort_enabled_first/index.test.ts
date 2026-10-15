/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortEnabledFirst } from '.';

interface TestItem {
  enabled?: boolean;
  name: string;
}

describe('sortEnabledFirst', () => {
  it('returns an empty array when given an empty array', () => {
    expect(sortEnabledFirst([])).toEqual([]);
  });

  it('returns a single item unchanged', () => {
    const items: TestItem[] = [{ name: 'only' }];

    expect(sortEnabledFirst(items)).toEqual([{ name: 'only' }]);
  });

  it('places enabled items before disabled items', () => {
    const items: TestItem[] = [
      { enabled: false, name: 'disabled' },
      { enabled: true, name: 'enabled' },
    ];

    const result = sortEnabledFirst(items);

    expect(result[0].name).toBe('enabled');
    expect(result[1].name).toBe('disabled');
  });

  it('treats undefined enabled as enabled (before disabled)', () => {
    const items: TestItem[] = [{ enabled: false, name: 'disabled' }, { name: 'undefined-enabled' }];

    const result = sortEnabledFirst(items);

    expect(result[0].name).toBe('undefined-enabled');
    expect(result[1].name).toBe('disabled');
  });

  it('preserves relative order among items with the same enabled status', () => {
    const items: TestItem[] = [
      { enabled: true, name: 'first-enabled' },
      { enabled: true, name: 'second-enabled' },
      { enabled: false, name: 'first-disabled' },
      { enabled: false, name: 'second-disabled' },
    ];

    const result = sortEnabledFirst(items);

    expect(result).toEqual([
      { enabled: true, name: 'first-enabled' },
      { enabled: true, name: 'second-enabled' },
      { enabled: false, name: 'first-disabled' },
      { enabled: false, name: 'second-disabled' },
    ]);
  });

  it('does not mutate the original array', () => {
    const items: TestItem[] = [
      { enabled: false, name: 'disabled' },
      { enabled: true, name: 'enabled' },
    ];
    const original = [...items];

    sortEnabledFirst(items);

    expect(items).toEqual(original);
  });
});
