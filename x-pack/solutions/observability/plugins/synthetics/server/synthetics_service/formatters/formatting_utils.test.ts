/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { replaceStringWithParams } from './formatting_utils';
import { loggerMock } from '@kbn/logging-mocks';

describe('replaceStringWithParams', () => {
  const logger = loggerMock.create();

  it('replaces params', () => {
    const result = replaceStringWithParams(
      '${homePageUrl}',
      { homePageUrl: 'https://elastic.co' },
      logger
    );

    expect(result).toEqual('https://elastic.co');
  });

  it('works with dashes in the key', () => {
    const result = replaceStringWithParams(
      '${home-page-url}',
      { 'home-page-url': 'https://elastic.co' },
      logger
    );

    expect(result).toEqual('https://elastic.co');
  });

  it('works with . in the key', () => {
    const result = replaceStringWithParams(
      '${home.pageUrl}',
      { 'home.pageUrl': 'https://elastic.co' },
      logger
    );

    expect(result).toEqual('https://elastic.co');
  });

  it('returns same value in case no param', () => {
    const result = replaceStringWithParams('${homePageUrl}', {}, logger);

    expect(result).toEqual('${homePageUrl}');
  });

  it('works on objects', () => {
    const result = replaceStringWithParams(
      { key: 'Basic ${homePageUrl}' },
      { homePageUrl: 'https://elastic.co' },
      logger
    );

    expect(result).toEqual({ key: 'Basic https://elastic.co' });
  });

  it('works on arrays', () => {
    const result = replaceStringWithParams(
      ['Basic ${homePageUrl}'],
      { homePageUrl: 'https://elastic.co' },
      logger
    );

    expect(result).toEqual(['Basic https://elastic.co']);
  });

  it('works on multiple', () => {
    const result = replaceStringWithParams(
      'Basic ${homePageUrl} ${homePageUrl1}',
      { homePageUrl: 'https://elastic.co', homePageUrl1: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('Basic https://elastic.co https://elastic.co/product');
  });

  it('works on multiple without spaces', () => {
    const result = replaceStringWithParams(
      'Basic ${homePageUrl}${homePageUrl1}',
      { homePageUrl: 'https://elastic.co', homePageUrl1: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('Basic https://elastic.cohttps://elastic.co/product');
  });

  it('works on multiple without spaces and one missing', () => {
    const result = replaceStringWithParams(
      'Basic ${homePageUrl}${homePageUrl1}',
      { homePageUrl: 'https://elastic.co', homePageUrl2: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('Basic https://elastic.co${homePageUrl1}');
  });

  it('works on multiple without with default', () => {
    const result = replaceStringWithParams(
      'Basic ${homePageUrl}${homePageUrl1:test}',
      { homePageUrl: 'https://elastic.co', homePageUrl2: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('Basic https://elastic.cotest');
  });

  it('works on multiple with multiple defaults', () => {
    const result = replaceStringWithParams(
      'Basic ${homePageUrl:test}${homePageUrl1:test4}',
      { homePageUrl3: 'https://elastic.co', homePageUrl2: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('Basic testtest4');
  });

  it('works with default value', () => {
    const result = replaceStringWithParams(
      'Basic ${homePageUrl:https://elastic.co} ${homePageUrl1}',
      { homePageUrl1: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('Basic https://elastic.co https://elastic.co/product');
  });

  it('works with $ as part of value', () => {
    const result = replaceStringWithParams(
      'Basic  $auth',
      { homePageUrl1: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('Basic  $auth');
  });

  it('works with ${ as part of value', () => {
    const result = replaceStringWithParams(
      'Basic  ${auth',
      { homePageUrl1: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('Basic  ${auth');
  });
  it('works with { as part of value', () => {
    const result = replaceStringWithParams(
      'Basic  {auth',
      { homePageUrl1: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('Basic  {auth');
  });
  it('works with {} as part of value', () => {
    const result = replaceStringWithParams(
      'Basic  {}',
      { homePageUrl1: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('Basic  {}');
  });
  it('works with {$ as part of value', () => {
    const result = replaceStringWithParams(
      'Basic  {$',
      { homePageUrl1: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('Basic  {$');
  });

  it('works with ${} as part of value', () => {
    const result = replaceStringWithParams(
      'Basic  ${} value',
      { homePageUrl1: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('Basic  ${} value');
  });

  it('works with ${host.name} for missing params', () => {
    const result = replaceStringWithParams(
      'Basic  ${host.name} value',
      { homePageUrl1: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('Basic  ${host.name} value');
  });

  it('works with ${host.name} one missing params', () => {
    const result = replaceStringWithParams(
      'Basic ${host.name} ${homePageUrl1} value',
      { homePageUrl1: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('Basic ${host.name} https://elastic.co/product value');
  });

  it('works with ${host.name} just missing params', () => {
    const result = replaceStringWithParams(
      '${host.name} ${homePageUrl1}',
      { homePageUrl1: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('${host.name} https://elastic.co/product');
  });

  it('works with } ${abc} as part of value', () => {
    const result = replaceStringWithParams(
      'Basic } ${homePageUrl1} value',
      { homePageUrl1: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('Basic } https://elastic.co/product value');
  });

  it('works with ${abc} { as part of value', () => {
    const result = replaceStringWithParams(
      'Basic ${homePageUrl1} { value',
      { homePageUrl1: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('Basic https://elastic.co/product { value');
  });

  it("returns value as string | null when no params and it's an object", () => {
    const result = replaceStringWithParams({}, { param: '1' }, logger);

    expect(result).toEqual({});
  });
});
