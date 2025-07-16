/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  encodeQueryUrl,
  composeQueryFilters,
  encodeFlyout,
  decodeFlyout,
  encodeRisonParam,
  decodeRisonParam,
  encodeMultipleRisonParams,
  decodeMultipleRisonParams,
} from './query_utils';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';

const DEFAULT_DATA_VIEW_ID = 'security-solution-default';

describe('composeQueryFilters', () => {
  it('Should return correct filters given some filterParams', () => {
    const testFilterParams = {
      test_field: 'test_value',
    };
    const testResult = [
      {
        meta: {
          alias: null,
          negate: false,
          disabled: false,
          type: 'phrase',
          key: 'test_field',
          index: DEFAULT_DATA_VIEW_ID,
        },
        query: { match_phrase: { test_field: 'test_value' } },
      },
    ];
    expect(composeQueryFilters(testFilterParams)).toEqual(testResult);
  });

  it('Should return empty filters given empty filterParams', () => {
    expect(composeQueryFilters({})).toEqual([]);
  });

  it('Should return correct filters given some filterParams and dataviewId', () => {
    const testFilterParams = {
      test_field: 'test_value',
    };
    const testResult = [
      {
        meta: {
          alias: null,
          negate: false,
          disabled: false,
          type: 'phrase',
          key: 'test_field',
          index: 'test-data-view',
        },
        query: { match_phrase: { test_field: 'test_value' } },
      },
    ];
    expect(composeQueryFilters(testFilterParams, 'test-data-view')).toEqual(testResult);
  });

  it('Should return correct filters given multiple values in one of the filters params', () => {
    const testFilterParams = {
      test_field: ['test_value_1', 'test_value_2', 'test_value_3'],
    };
    const testResult = [
      {
        meta: {
          alias: null,
          negate: false,
          disabled: false,
          type: 'phrase',
          key: 'test_field',
          index: 'test-data-view',
        },
        query: { match_phrase: { test_field: 'test_value_1' } },
      },
      {
        meta: {
          alias: null,
          negate: false,
          disabled: false,
          type: 'phrase',
          key: 'test_field',
          index: 'test-data-view',
        },
        query: { match_phrase: { test_field: 'test_value_2' } },
      },
      {
        meta: {
          alias: null,
          negate: false,
          disabled: false,
          type: 'phrase',
          key: 'test_field',
          index: 'test-data-view',
        },
        query: { match_phrase: { test_field: 'test_value_3' } },
      },
    ];
    expect(composeQueryFilters(testFilterParams, 'test-data-view')).toEqual(testResult);
  });

  it('Should return correct filters given multiple values in multiple fields', () => {
    const testFilterParams = {
      test_field: ['test_value_1', 'test_value_2', 'test_value_3'],
      another_test_field: ['another_test_field_value_1', 'another_test_field_value_2'],
    };
    const testResult = [
      {
        meta: {
          alias: null,
          negate: false,
          disabled: false,
          type: 'phrase',
          key: 'test_field',
          index: 'test-data-view',
        },
        query: { match_phrase: { test_field: 'test_value_1' } },
      },
      {
        meta: {
          alias: null,
          negate: false,
          disabled: false,
          type: 'phrase',
          key: 'test_field',
          index: 'test-data-view',
        },
        query: { match_phrase: { test_field: 'test_value_2' } },
      },
      {
        meta: {
          alias: null,
          negate: false,
          disabled: false,
          type: 'phrase',
          key: 'test_field',
          index: 'test-data-view',
        },
        query: { match_phrase: { test_field: 'test_value_3' } },
      },
      {
        meta: {
          alias: null,
          negate: false,
          disabled: false,
          type: 'phrase',
          key: 'another_test_field',
          index: 'test-data-view',
        },
        query: { match_phrase: { another_test_field: 'another_test_field_value_1' } },
      },
      {
        meta: {
          alias: null,
          negate: false,
          disabled: false,
          type: 'phrase',
          key: 'another_test_field',
          index: 'test-data-view',
        },
        query: { match_phrase: { another_test_field: 'another_test_field_value_2' } },
      },
    ];
    expect(composeQueryFilters(testFilterParams, 'test-data-view')).toEqual(testResult);
  });
});

describe('encodeQueryUrl', () => {
  const getServicesMock = () => ({
    data: dataPluginMock.createStartContract(),
  });

  it('Should return correct URL given empty filters', () => {
    const result = 'cspq=(filters:!())';
    expect(encodeQueryUrl(getServicesMock().data, [])).toEqual(result);
  });

  it('should return correct URL given filters', () => {
    const filter = [
      {
        meta: {
          alias: null,
          negate: false,
          disabled: false,
          type: 'phrase',
          key: 'test_field',
          index: DEFAULT_DATA_VIEW_ID,
        },
        query: { match_phrase: { test_field: 'test_value' } },
      },
    ];
    const result =
      'cspq=(filters:!((meta:(alias:!n,disabled:!f,index:security-solution-default,key:test_field,negate:!f,type:phrase),query:(match_phrase:(test_field:test_value)))))';
    expect(encodeQueryUrl(getServicesMock().data, filter)).toEqual(result);
  });

  it('should return correct URL given filters and group by', () => {
    const filter = [
      {
        meta: {
          alias: null,
          negate: false,
          disabled: false,
          type: 'phrase',
          key: 'test_field',
          index: DEFAULT_DATA_VIEW_ID,
        },
        query: { match_phrase: { test_field: 'test_value' } },
      },
    ];
    const groupByFilter = ['filterA'];
    const result =
      'cspq=(filters:!((meta:(alias:!n,disabled:!f,index:security-solution-default,key:test_field,negate:!f,type:phrase),query:(match_phrase:(test_field:test_value)))),groupBy:!(filterA))';
    expect(encodeQueryUrl(getServicesMock().data, filter, groupByFilter)).toEqual(result);
  });

  it('should return correct URL given filters with multiple values for a specific filter and group by', () => {
    const filter = [
      {
        meta: {
          alias: null,
          negate: false,
          disabled: false,
          type: 'phrase',
          key: 'test_field',
          index: DEFAULT_DATA_VIEW_ID,
        },
        query: { match_phrase: { test_field: 'test_value_1' } },
      },
      {
        meta: {
          alias: null,
          negate: false,
          disabled: false,
          type: 'phrase',
          key: 'test_field',
          index: DEFAULT_DATA_VIEW_ID,
        },
        query: { match_phrase: { test_field: 'test_value_2' } },
      },
    ];
    const groupByFilter = ['filterA'];
    const result =
      'cspq=(filters:!((meta:(alias:!n,disabled:!f,index:security-solution-default,key:test_field,negate:!f,type:phrase),query:(match_phrase:(test_field:test_value_1))),(meta:(alias:!n,disabled:!f,index:security-solution-default,key:test_field,negate:!f,type:phrase),query:(match_phrase:(test_field:test_value_2)))),groupBy:!(filterA))';
    expect(encodeQueryUrl(getServicesMock().data, filter, groupByFilter)).toEqual(result);
  });
});

describe('encodeFlyout', () => {
  it('Should return correct encoded flyout', () => {
    const flyout = {
      id: 'test-flyout',
      title: 'Test Flyout',
      content: 'This is a test flyout',
    };
    const result = encodeFlyout(flyout);
    expect(result).toContain('flyout=');
    expect(result).toContain('id:test-flyout');
    expect(result).toContain("title:'Test Flyout'");
    expect(result).toContain("content:'This is a test flyout'");
  });

  it('Should return undefined for invalid flyout', () => {
    expect(encodeFlyout(undefined)).toBeUndefined();
  });
});

describe('decodeFlyout', () => {
  it('Should return correct decoded flyout', () => {
    const search = "flyout=(id:test-flyout,title:'Test Flyout',content:'This is a test flyout')";
    const result = {
      id: 'test-flyout',
      title: 'Test Flyout',
      content: 'This is a test flyout',
    };
    expect(decodeFlyout(search)).toEqual(result);
  });

  it('Should return undefined for invalid search', () => {
    expect(decodeFlyout('invalid-search')).toBeUndefined();
  });
});

describe('encodeRisonParam', () => {
  it('Should return correct encoded Rison param', () => {
    const param = {
      key: 'test-key',
      value: 'test-value',
    };
    const result = 'customParam=(key:test-key,value:test-value)';
    expect(encodeRisonParam('customParam', param)).toEqual(result);
  });

  it('Should return undefined for invalid param', () => {
    expect(encodeRisonParam('test', undefined)).toBeUndefined();
  });
});

describe('decodeRisonParam', () => {
  it('Should return correct decoded Rison param', () => {
    const search = 'customParam=(key:test-key,value:test-value)';
    const result = {
      key: 'test-key',
      value: 'test-value',
    };
    expect(decodeRisonParam(search, 'customParam')).toEqual(result);
  });

  it('Should return undefined for missing param', () => {
    expect(decodeRisonParam('other=value', 'customParam')).toBeUndefined();
  });
});

describe('encodeMultipleRisonParams', () => {
  it('Should return correct encoded multiple Rison params', () => {
    const params = {
      cspq: {
        filters: [],
        query: { match_all: {} },
      },
      flyout: {
        id: 'test-flyout',
        title: 'Test Flyout',
      },
    };
    const result = encodeMultipleRisonParams(params);
    expect(result).toContain('cspq=');
    expect(result).toContain('flyout=');
    expect(result).toContain('&');
  });

  it('Should return undefined for empty params', () => {
    expect(encodeMultipleRisonParams({})).toBeUndefined();
  });
});

describe('decodeMultipleRisonParams', () => {
  it('Should return correct decoded multiple Rison params', () => {
    const search =
      "cspq=(filters:!(),query:(match_all:()))&flyout=(id:test-flyout,title:'Test Flyout')";
    const paramKeys = ['cspq', 'flyout'];
    const result = decodeMultipleRisonParams(search, paramKeys);

    expect(result).toHaveProperty('cspq');
    expect(result).toHaveProperty('flyout');
    expect(result.flyout).toEqual({
      id: 'test-flyout',
      title: 'Test Flyout',
    });
  });

  it('Should return empty object for invalid search', () => {
    const result = decodeMultipleRisonParams('invalid-search', ['cspq', 'flyout']);
    expect(result).toEqual({});
  });
});
