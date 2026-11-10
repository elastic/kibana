/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterValue } from '../../../common/filter_values';
import { SESSION_ATTRIBUTE_FIELDS } from '../../../common/session_attribute_fields';
import {
  documentFilters,
  filterFieldOf,
  filterOptionsAggs,
  filterRuntimeMappings,
  pageLoadFilters,
  toFilterOptions,
} from './overview_filters';

const include = (...values: string[]): FilterValue[] =>
  values.map((value) => ({ value, exclude: false }));
const exclude = (...values: string[]): FilterValue[] =>
  values.map((value) => ({ value, exclude: true }));

interface FilterAggregation {
  filter: { bool: { filter: unknown[] } };
  aggs: { values: { terms: { field: string; size: number } } };
}

const optionsOf = (aggs: ReturnType<typeof filterOptionsAggs>, name: string) =>
  aggs[`${name}Options`] as unknown as FilterAggregation;

describe('filterRuntimeMappings', () => {
  it('reads the same fields as the sessions transform, so a value means the same in both', () => {
    const mappings = filterRuntimeMappings();

    const fieldsOf = (name: string) =>
      (mappings[name] as unknown as { script: { params: { fields: string[] } } }).script.params
        .fields;
    expect(fieldsOf('digital_experience_filter_browser')).toEqual(SESSION_ATTRIBUTE_FIELDS.browser);
    expect(fieldsOf('digital_experience_filter_os')).toEqual(SESSION_ATTRIBUTE_FIELDS.os);
    // The device then falls back to whether the browser is mobile, which EDOT Browser records.
    expect(fieldsOf('digital_experience_filter_device')).toEqual([
      ...SESSION_ATTRIBUTE_FIELDS.device,
      'resource.attributes.browser.mobile',
      'attributes.browser.mobile',
    ]);
    expect(fieldsOf('digital_experience_filter_country')).toEqual(
      SESSION_ATTRIBUTE_FIELDS.countryIso
    );
  });

  it('takes the first non-empty value, and skips fields the indices do not map', () => {
    const { digital_experience_filter_browser: browser } = filterRuntimeMappings();

    expect(browser).toMatchObject({ type: 'keyword' });
    const { source } = (browser as unknown as { script: { source: string } }).script;
    expect(source).toContain('doc.containsKey(field)');
    expect(source).toContain('emit(value)');
    expect(source).toContain('break;');
  });

  it('names the device "Mobile" or "Desktop" when only the browser says whether it is mobile', () => {
    const { digital_experience_filter_device: device } = filterRuntimeMappings();
    const { script } = device as unknown as {
      script: { source: string; params: { labels: Record<string, Record<string, string>> } };
    };

    expect(script.source).toContain('params.labels.get(field)');
    expect(script.params.labels).toEqual({
      'resource.attributes.browser.mobile': { true: 'Mobile', false: 'Desktop' },
      'attributes.browser.mobile': { true: 'Mobile', false: 'Desktop' },
    });
  });

  it('has no runtime field for the page, which is one field', () => {
    expect(Object.keys(filterRuntimeMappings())).not.toContain('digital_experience_filter_pageUrl');
  });
});

describe('filterFieldOf', () => {
  it('uses the runtime field of a filter with alternatives, and the field of the page', () => {
    expect(filterFieldOf('browser')).toBe('digital_experience_filter_browser');
    expect(filterFieldOf('country')).toBe('digital_experience_filter_country');
    expect(filterFieldOf('pageUrl')).toBe('attributes.url.full');
  });
});

describe('documentFilters', () => {
  it('has no clause without a selection', () => {
    expect(documentFilters({})).toEqual([]);
    expect(documentFilters({ browser: [] })).toEqual([]);
  });

  it('narrows every document to the selected browser, OS, device and country', () => {
    expect(
      documentFilters({
        browser: include('Chrome'),
        os: include('macOS'),
        device: include('iPhone'),
        country: include('DE'),
      })
    ).toEqual([
      { terms: { digital_experience_filter_browser: ['Chrome'] } },
      { terms: { digital_experience_filter_os: ['macOS'] } },
      { terms: { digital_experience_filter_device: ['iPhone'] } },
      { terms: { digital_experience_filter_country: ['DE'] } },
    ]);
  });

  it('keeps the documents with any of the included values', () => {
    expect(documentFilters({ browser: include('Chrome', 'Firefox') })).toEqual([
      { terms: { digital_experience_filter_browser: ['Chrome', 'Firefox'] } },
    ]);
  });

  it('leaves out the documents with an excluded value', () => {
    expect(documentFilters({ browser: exclude('Chrome', 'Safari') })).toEqual([
      {
        bool: {
          must_not: [{ terms: { digital_experience_filter_browser: ['Chrome', 'Safari'] } }],
        },
      },
    ]);
  });

  it('combines included and excluded values of one filter', () => {
    expect(documentFilters({ os: [...include('macOS', 'Linux'), ...exclude('Windows')] })).toEqual([
      { terms: { digital_experience_filter_os: ['macOS', 'Linux'] } },
      { bool: { must_not: [{ terms: { digital_experience_filter_os: ['Windows'] } }] } },
    ]);
  });

  it('leaves out the page, which narrows the page loads only', () => {
    expect(documentFilters({ pageUrl: include('https://shop.example.com/') })).toEqual([]);
  });

  it('leaves out the excluded filter, so its other values stay selectable', () => {
    expect(
      documentFilters({ browser: include('Chrome'), os: include('macOS') }, 'browser')
    ).toEqual([{ terms: { digital_experience_filter_os: ['macOS'] } }]);
  });
});

describe('the app version filter', () => {
  it('reads the version of the resource, or of the event, whichever the data has', () => {
    const appVersion = filterRuntimeMappings()[filterFieldOf('appVersion')];

    expect(
      (appVersion as unknown as { script: { params: { fields: string[] } } }).script.params.fields
    ).toEqual(['resource.attributes.service.version', 'attributes.service.version']);
    expect(filterFieldOf('appVersion')).toBe('digital_experience_filter_appVersion');
  });

  it('narrows every document to the selected versions, or leaves out the excluded ones', () => {
    expect(
      documentFilters({ appVersion: [...include('1.2.0', '1.3.0'), ...exclude('0.9')] })
    ).toEqual([
      { terms: { [filterFieldOf('appVersion')]: ['1.2.0', '1.3.0'] } },
      { bool: { must_not: [{ terms: { [filterFieldOf('appVersion')]: ['0.9'] } }] } },
    ]);
  });
});

describe('the page contains filter', () => {
  const contains = (text: string) => ({
    wildcard: { 'attributes.url.full': { value: `*${text}*`, case_insensitive: true } },
  });

  it('keeps the page loads whose URL contains any included text, whatever its case', () => {
    expect(pageLoadFilters({ pageContains: include('/checkout', 'cart') })).toEqual([
      { bool: { should: [contains('/checkout'), contains('cart')], minimum_should_match: 1 } },
    ]);
  });

  it('leaves out the page loads whose URL contains an excluded text', () => {
    expect(pageLoadFilters({ pageContains: exclude('/admin') })).toEqual([
      { bool: { must_not: [contains('/admin')] } },
    ]);
  });

  it('takes the wildcard characters of the text as the text itself', () => {
    expect(pageLoadFilters({ pageContains: include('a*b?c\\d') })).toEqual([
      {
        bool: {
          should: [
            {
              wildcard: {
                'attributes.url.full': { value: '*a\\*b\\?c\\\\d*', case_insensitive: true },
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
    ]);
  });

  it('narrows the page loads only, like the page, and each page filter leaves the other alone', () => {
    const filters = {
      pageUrl: include('https://shop.example.com/'),
      pageContains: include('cart'),
    };

    expect(documentFilters(filters)).toEqual([]);
    expect(pageLoadFilters(filters)).toHaveLength(2);
    expect(pageLoadFilters(filters, 'pageUrl')).toEqual([
      { bool: { should: [contains('cart')], minimum_should_match: 1 } },
    ]);
    expect(pageLoadFilters(filters, 'pageContains')).toEqual([
      { terms: { 'attributes.url.full': ['https://shop.example.com/'] } },
    ]);
  });

  it('has no values to pick from, but the other filters have', () => {
    expect(toFilterOptions().pageContains).toEqual([]);
    expect(
      toFilterOptions({
        appVersionOptions: { values: { buckets: [{ key: '1.3.0', doc_count: 3 }] } },
      }).appVersion
    ).toEqual([{ key: '1.3.0', count: 3 }]);
  });
});

describe('pageLoadFilters', () => {
  it('narrows the page loads to the selected pages, or leaves out the excluded ones', () => {
    expect(pageLoadFilters({ pageUrl: include('https://shop.example.com/') })).toEqual([
      { terms: { 'attributes.url.full': ['https://shop.example.com/'] } },
    ]);
    expect(pageLoadFilters({ pageUrl: exclude('https://shop.example.com/') })).toEqual([
      { bool: { must_not: [{ terms: { 'attributes.url.full': ['https://shop.example.com/'] } }] } },
    ]);
    expect(pageLoadFilters({ browser: include('Chrome') })).toEqual([]);
  });

  it('leaves out the page when it is the excluded filter', () => {
    expect(pageLoadFilters({ pageUrl: include('https://shop.example.com/') }, 'pageUrl')).toEqual(
      []
    );
  });
});

describe('filterOptionsAggs', () => {
  const FILTERS = {
    browser: include('Chrome'),
    os: include('macOS'),
    pageUrl: include('https://shop.example.com/'),
  };

  it('lists the ten most used values of every filter', () => {
    const aggs = filterOptionsAggs({}, undefined);

    // Text the URL contains is written, so it has no list.
    expect(Object.keys(aggs)).toEqual([
      'browserOptions',
      'osOptions',
      'deviceOptions',
      'countryOptions',
      'appVersionOptions',
      'pageUrlOptions',
    ]);
    expect(optionsOf(aggs, 'browser').aggs.values.terms).toEqual({
      field: 'digital_experience_filter_browser',
      size: 10,
    });
    expect(optionsOf(aggs, 'pageUrl').aggs.values.terms).toEqual({
      field: 'attributes.url.full',
      size: 10,
    });
  });

  it('counts page loads of the selected environment', () => {
    const clauses = optionsOf(filterOptionsAggs({}, 'production'), 'browser').filter.bool.filter;

    expect(clauses).toEqual([
      expect.anything(),
      { bool: { filter: [{ term: { event_name: 'browser.navigation_timing' } }] } },
    ]);
    expect(clauses[0]).toEqual({
      bool: {
        should: [
          { term: { 'service.environment': 'production' } },
          { term: { 'resource.attributes.deployment.environment.name': 'production' } },
        ],
        minimum_should_match: 1,
      },
    });
  });

  it('ignores the filter’s own selection and applies the others', () => {
    const aggs = filterOptionsAggs(FILTERS, undefined);

    const clausesOf = (name: string) => optionsOf(aggs, name).filter.bool.filter;
    expect(clausesOf('browser')).toEqual(
      expect.arrayContaining([
        { terms: { digital_experience_filter_os: ['macOS'] } },
        { terms: { 'attributes.url.full': ['https://shop.example.com/'] } },
      ])
    );
    expect(clausesOf('browser')).not.toContainEqual({
      terms: { digital_experience_filter_browser: ['Chrome'] },
    });
    expect(clausesOf('pageUrl')).toContainEqual({
      terms: { digital_experience_filter_browser: ['Chrome'] },
    });
    expect(clausesOf('pageUrl')).not.toContainEqual({
      terms: { 'attributes.url.full': ['https://shop.example.com/'] },
    });
    expect(clausesOf('device')).toEqual(
      expect.arrayContaining([
        { terms: { digital_experience_filter_browser: ['Chrome'] } },
        { terms: { digital_experience_filter_os: ['macOS'] } },
      ])
    );
  });

  it('still lists a value the filter excludes, so it can be included again', () => {
    const aggs = filterOptionsAggs({ browser: exclude('Chrome') }, undefined);

    expect(JSON.stringify(optionsOf(aggs, 'browser').filter)).not.toContain('Chrome');
  });
});

describe('toFilterOptions', () => {
  it('has no values for empty data', () => {
    expect(toFilterOptions()).toEqual({
      browser: [],
      os: [],
      device: [],
      country: [],
      appVersion: [],
      pageUrl: [],
      pageContains: [],
    });
  });

  it('maps the buckets and leaves out the values the routes would not accept back', () => {
    expect(
      toFilterOptions({
        browserOptions: {
          values: {
            buckets: [
              { key: 'Chrome', doc_count: 3 },
              { key: 'x'.repeat(257), doc_count: 1 },
            ],
          },
        },
      }).browser
    ).toEqual([{ key: 'Chrome', count: 3 }]);
  });
});
