/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { facetValueLabel, firstSelectedLabel, withSelectedOptions } from './filter_defs';

describe('withSelectedOptions', () => {
  it('prepends selected values missing from the facet', () => {
    expect(
      withSelectedOptions(
        [{ key: 'Chrome', count: 12 }],
        ['Firefox', 'Chrome'],
        (key) => `${key} browser`
      )
    ).toEqual([
      { key: 'Firefox', label: 'Firefox browser', count: 0 },
      { key: 'Chrome', count: 12 },
    ]);
  });

  it('leaves the list unchanged when every selection is present', () => {
    const options = [{ key: 'Chrome', count: 12 }];
    expect(withSelectedOptions(options, ['Chrome'])).toBe(options);
  });
});

describe('facetValueLabel', () => {
  it('pretty-prints known browser, OS, and connection keys', () => {
    expect(facetValueLabel('browser', 'chrome_headless')).toBe('Chrome Headless');
    expect(facetValueLabel('os', 'macos')).toBe('macOS');
    expect(facetValueLabel('connection', '4g')).toBe('4G');
    expect(facetValueLabel('device', '8')).toBe('8 GB');
  });
});

describe('firstSelectedLabel', () => {
  it('uses the option label when present', () => {
    expect(
      firstSelectedLabel(
        [
          { key: '8', label: '8 GB', count: 4 },
          { key: '4', label: '4 GB', count: 2 },
        ],
        ['8', '4']
      )
    ).toBe('8 GB');
  });
});
