/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SESSION_ATTRIBUTE_FIELDS } from '../../../common/session_attribute_fields';
import {
  documentFilters,
  filterFieldOf,
  filterOptionsAggs,
  filterRuntimeMappings,
  pageLoadFilters,
} from './overview_filters';

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
    expect(fieldsOf('digital_experience_filter_device')).toEqual(SESSION_ATTRIBUTE_FIELDS.device);
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
  });

  it('narrows every document to the selected browser, OS, device and country', () => {
    expect(
      documentFilters({ browser: 'Chrome', os: 'macOS', device: 'iPhone', country: 'DE' })
    ).toEqual([
      { term: { digital_experience_filter_browser: 'Chrome' } },
      { term: { digital_experience_filter_os: 'macOS' } },
      { term: { digital_experience_filter_device: 'iPhone' } },
      { term: { digital_experience_filter_country: 'DE' } },
    ]);
  });

  it('leaves out the page, which narrows the page loads only', () => {
    expect(documentFilters({ pageUrl: 'https://shop.example.com/' })).toEqual([]);
  });

  it('leaves out the excluded filter, so its other values stay selectable', () => {
    expect(documentFilters({ browser: 'Chrome', os: 'macOS' }, 'browser')).toEqual([
      { term: { digital_experience_filter_os: 'macOS' } },
    ]);
  });
});

describe('pageLoadFilters', () => {
  it('narrows the page loads to the selected page', () => {
    expect(pageLoadFilters({ pageUrl: 'https://shop.example.com/' })).toEqual([
      { term: { 'attributes.url.full': 'https://shop.example.com/' } },
    ]);
    expect(pageLoadFilters({ browser: 'Chrome' })).toEqual([]);
  });

  it('leaves out the page when it is the excluded filter', () => {
    expect(pageLoadFilters({ pageUrl: 'https://shop.example.com/' }, 'pageUrl')).toEqual([]);
  });
});

describe('filterOptionsAggs', () => {
  const FILTERS = { browser: 'Chrome', os: 'macOS', pageUrl: 'https://shop.example.com/' };

  it('lists the ten most used values of every filter', () => {
    const aggs = filterOptionsAggs({}, undefined);

    expect(Object.keys(aggs)).toEqual([
      'browserOptions',
      'osOptions',
      'deviceOptions',
      'countryOptions',
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
        { term: { digital_experience_filter_os: 'macOS' } },
        { term: { 'attributes.url.full': 'https://shop.example.com/' } },
      ])
    );
    expect(clausesOf('browser')).not.toContainEqual({
      term: { digital_experience_filter_browser: 'Chrome' },
    });
    expect(clausesOf('pageUrl')).toContainEqual({
      term: { digital_experience_filter_browser: 'Chrome' },
    });
    expect(clausesOf('pageUrl')).not.toContainEqual({
      term: { 'attributes.url.full': 'https://shop.example.com/' },
    });
    expect(clausesOf('device')).toEqual(
      expect.arrayContaining([
        { term: { digital_experience_filter_browser: 'Chrome' } },
        { term: { digital_experience_filter_os: 'macOS' } },
      ])
    );
  });
});
