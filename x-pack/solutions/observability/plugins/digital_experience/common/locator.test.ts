/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DIGITAL_EXPERIENCE_LOCATOR_ID,
  DigitalExperienceLocatorDefinition,
  type DigitalExperienceLocatorParams,
} from './locator';

describe('DigitalExperienceLocatorDefinition', () => {
  const locator = new DigitalExperienceLocatorDefinition();
  const pathOf = async (params: DigitalExperienceLocatorParams) =>
    (await locator.getLocation(params)).path;

  it('opens the digital_experience app with its own id', async () => {
    expect(locator.id).toBe(DIGITAL_EXPERIENCE_LOCATOR_ID);
    expect(await locator.getLocation({})).toEqual({
      app: 'digital_experience',
      path: '/',
      state: {},
    });
  });

  it('opens the list of applications without a service name', async () => {
    expect(await pathOf({ environment: 'production', sourceFilter: 'otel' })).toBe(
      '/?environment=production&sourceFilter=otel'
    );
  });

  it('opens the Overview of an application unless another tab is asked for', async () => {
    expect(await pathOf({ serviceName: 'storefront-web' })).toBe('/storefront-web');
    expect(await pathOf({ serviceName: 'storefront-web', tab: 'overview' })).toBe(
      '/storefront-web'
    );
    expect(await pathOf({ serviceName: 'storefront-web', tab: 'errors' })).toBe(
      '/storefront-web/errors'
    );
    expect(await pathOf({ serviceName: 'storefront-web', tab: 'network' })).toBe(
      '/storefront-web/network'
    );
    expect(await pathOf({ serviceName: 'storefront-web', tab: 'sessions' })).toBe(
      '/storefront-web/sessions'
    );
  });

  it('opens the Overview for a tab it does not know', async () => {
    expect(
      await pathOf({
        serviceName: 'storefront-web',
        tab: '../../admin' as DigitalExperienceLocatorParams['tab'],
      })
    ).toBe('/storefront-web');
  });

  it('encodes the service name in the path', async () => {
    expect(await pathOf({ serviceName: 'shop/web app?', tab: 'errors' })).toBe(
      '/shop%2Fweb%20app%3F/errors'
    );
  });

  it('keeps the state of the Overview, sorted like the router sorts it', async () => {
    const filters = '!((meta:(key:browser,type:phrase,params:(query:Chrome),negate:!f)))';
    const path = await pathOf({
      serviceName: 'storefront-web',
      source: 'otel',
      rangeTo: 'now',
      rangeFrom: 'now-3h',
      percentile: '95',
      kuery: 'url.path : "/cart"',
      filters,
    });
    const [, search] = path.split('?');

    expect(path.startsWith('/storefront-web?')).toBe(true);
    expect(search.split('&').map((pair) => pair.split('=')[0])).toEqual([
      'filters',
      'kuery',
      'percentile',
      'rangeFrom',
      'rangeTo',
      'source',
    ]);
    expect(new URLSearchParams(search).get('filters')).toBe(filters);
    expect(new URLSearchParams(search).get('kuery')).toBe('url.path : "/cart"');
  });

  it('keeps the state of the Sessions list, with its numbers and booleans', async () => {
    const path = await pathOf({
      serviceName: 'storefront-web',
      tab: 'sessions',
      source: 'otel',
      hasErrors: true,
      page: 2,
      perPage: 50,
      sortField: 'duration',
      sortDirection: 'desc',
    });

    expect(path).toBe(
      '/storefront-web/sessions?hasErrors=true&page=2&perPage=50&sortDirection=desc&sortField=duration&source=otel'
    );
  });

  it('leaves out what is not a param of the app, unset or empty', async () => {
    expect(
      await pathOf({
        serviceName: 'storefront-web',
        environment: '',
        kuery: undefined,
        redirect: 'https://example.com',
        _g: '(time:(from:now-1y))',
        nested: { a: 1 },
      } as DigitalExperienceLocatorParams)
    ).toBe('/storefront-web');
  });

  describe('time range', () => {
    it('is read from both ends or not at all', () => {
      expect(locator.getTimeRange({ rangeFrom: 'now-3h', rangeTo: 'now' })).toEqual({
        from: 'now-3h',
        to: 'now',
      });
      expect(locator.getTimeRange({ rangeFrom: 'now-3h' })).toBeUndefined();
      expect(locator.getTimeRange({})).toBeUndefined();
    });

    it('is replaced in the params, or removed', () => {
      const params: DigitalExperienceLocatorParams = {
        serviceName: 'storefront-web',
        rangeFrom: 'now-3h',
        rangeTo: 'now',
      };

      expect(
        locator.setTimeRange(params, {
          from: '2026-11-08T09:00:00.000Z',
          to: '2026-11-08T12:00:00.000Z',
        })
      ).toEqual({
        serviceName: 'storefront-web',
        rangeFrom: '2026-11-08T09:00:00.000Z',
        rangeTo: '2026-11-08T12:00:00.000Z',
      });
      expect(locator.setTimeRange(params)).toEqual({ serviceName: 'storefront-web' });
    });
  });
});
