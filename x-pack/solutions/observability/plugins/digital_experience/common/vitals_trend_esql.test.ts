/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import { vitalTrendQuery } from './vitals_trend_esql';

describe('vitalTrendQuery', () => {
  it('takes the p75 of one vital of the application per bucket of the range', () => {
    const query = vitalTrendQuery('lcp', { serviceName: 'shop' });

    expect(query).toContain('FROM logs-*.otel-*');
    expect(query).toContain('resource.attributes.service.name == "shop"');
    expect(query).toContain('event_name == "browser.web_vital"');
    expect(query).toContain('TO_LOWER(attributes.browser.web_vital.name) == "lcp"');
    expect(query).toContain(
      'STATS p75 = PERCENTILE(attributes.browser.web_vital.value, 75) BY time = BUCKET(@timestamp, 50, ?_tstart, ?_tend)'
    );
  });

  it('reads unmapped attributes as null, so a filter on one no index maps does not fail', () => {
    expect(vitalTrendQuery('inp', { serviceName: 'shop' })).toMatch(
      /^SET unmapped_fields = "NULLIFY";\nFROM /
    );
  });

  it('keeps one environment in either field, or neither for "Not defined"', () => {
    expect(vitalTrendQuery('cls', { serviceName: 'shop', environment: 'production' })).toContain(
      '(service.environment == "production" OR resource.attributes.deployment.environment.name == "production")'
    );
    expect(
      vitalTrendQuery('cls', { serviceName: 'shop', environment: 'ENVIRONMENT_NOT_DEFINED' })
    ).toContain(
      '(service.environment == "ENVIRONMENT_NOT_DEFINED" OR (service.environment IS NULL AND resource.attributes.deployment.environment.name IS NULL))'
    );
    expect(
      vitalTrendQuery('cls', { serviceName: 'shop', environment: 'ENVIRONMENT_ALL' })
    ).not.toContain('service.environment ==');
  });

  it('narrows the vitals with the filters and the page, but not the URL text, which vitals lack', () => {
    const query = vitalTrendQuery('lcp', {
      serviceName: 'shop',
      filters: {
        browser: [{ value: 'Chrome', exclude: false }],
        pageUrl: [{ value: '/products/{slug}', exclude: false }],
        pageContains: [{ value: 'checkout', exclude: false }],
      },
    });

    expect(query).toContain('| EVAL filter_browser = COALESCE(');
    // The page by its route, or by its URL without one, as on the rest of the Overview.
    expect(query).toContain('filter_page_url = COALESCE(');
    expect(query).toContain(
      '| WHERE filter_browser IN ("Chrome") AND filter_page_url IN ("/products/{slug}")'
    );
    expect(query).not.toContain('checkout');
  });

  it('escapes the service name', () => {
    expect(vitalTrendQuery('lcp', { serviceName: 'a"b' })).toContain(
      'resource.attributes.service.name == "a\\"b"'
    );
  });

  it.each(['lcp', 'inp', 'cls', 'fcp', 'ttfb'] as const)('is valid ES|QL for %s', (vital) => {
    const { errors } = Parser.parse(
      vitalTrendQuery(vital, {
        serviceName: 'shop',
        environment: 'production',
        filters: {
          device: [{ value: 'Mobile', exclude: false }],
          appVersion: [{ value: '2.0.0', exclude: true }],
        },
      })
    );
    expect(errors).toEqual([]);
  });
});
