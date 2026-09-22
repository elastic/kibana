/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SharePluginStart } from '@kbn/share-plugin/public';
import {
  buildAlertDetailsPath,
  buildAlertDetailsUrl,
  buildSecurityEntityUrl,
  buildDiscoverEsqlUrl,
  buildDiscoverThreatReportNestedIocUrl,
  THREAT_REPORTS_LOOKUP_DATA_VIEW_ID,
  DISCOVER_LOOKUP_TIME_RANGE,
} from './discover_urls';
import { THREAT_REPORTS_INDEX_PATTERN } from './esql_queries';

describe('buildAlertDetailsUrl', () => {
  it('builds path with index and without timestamp when timestamp omitted', () => {
    expect(
      buildAlertDetailsPath({
        alertId: 'alert-1',
        index: '.alerts-security.alerts-default',
      })
    ).toBe('/app/security/alerts/redirect/alert-1?index=.alerts-security.alerts-default');
  });

  it('includes timestamp query param when provided', () => {
    expect(
      buildAlertDetailsPath({
        alertId: 'alert-1',
        index: '.alerts-security.alerts-default',
        timestamp: '2023-04-20T12:00:00.000Z',
      })
    ).toBe(
      '/app/security/alerts/redirect/alert-1?index=.alerts-security.alerts-default&timestamp=2023-04-20T12%3A00%3A00.000Z'
    );
  });

  it('defaults index from spaceId and applies prependPath', () => {
    const prependPath = jest.fn((path: string) => `/s/soc${path}`);
    expect(
      buildAlertDetailsUrl({
        prependPath,
        spaceId: 'soc',
        alertId: 'alert-9',
      })
    ).toBe('/s/soc/app/security/alerts/redirect/alert-9?index=.alerts-security.alerts-soc');
    expect(prependPath).toHaveBeenCalled();
  });
});

describe('buildSecurityEntityUrl', () => {
  it('builds a hosts deep link for a host.* field', () => {
    const getUrlForApp = jest
      .fn()
      .mockReturnValue('https://kbn.test/app/security/hosts/name/WIN-ANALYST01');
    const url = buildSecurityEntityUrl({
      getUrlForApp,
      field: 'host.name',
      value: 'WIN-ANALYST01',
    });

    expect(getUrlForApp).toHaveBeenCalledWith('securitySolutionUI', {
      deepLinkId: 'hosts',
      path: '/name/WIN-ANALYST01',
    });
    expect(url).toBe('https://kbn.test/app/security/hosts/name/WIN-ANALYST01');
  });

  it('builds a users deep link for a user.* field', () => {
    const getUrlForApp = jest
      .fn()
      .mockReturnValue('https://kbn.test/app/security/users/name/dev-user');
    const url = buildSecurityEntityUrl({ getUrlForApp, field: 'user.name', value: 'dev-user' });

    expect(getUrlForApp).toHaveBeenCalledWith('securitySolutionUI', {
      deepLinkId: 'users',
      path: '/name/dev-user',
    });
    expect(url).toBe('https://kbn.test/app/security/users/name/dev-user');
  });

  it('returns undefined for a service.* field', () => {
    const getUrlForApp = jest.fn();
    const url = buildSecurityEntityUrl({ getUrlForApp, field: 'service.name', value: 'checkout' });

    expect(url).toBeUndefined();
    expect(getUrlForApp).not.toHaveBeenCalled();
  });

  it('returns undefined when getUrlForApp is not provided', () => {
    const url = buildSecurityEntityUrl({ field: 'host.name', value: 'WIN-ANALYST01' });

    expect(url).toBeUndefined();
  });

  it('URL-encodes the entity value', () => {
    const getUrlForApp = jest.fn().mockReturnValue('encoded');
    buildSecurityEntityUrl({ getUrlForApp, field: 'host.name', value: 'host name/with slash' });

    expect(getUrlForApp).toHaveBeenCalledWith('securitySolutionUI', {
      deepLinkId: 'hosts',
      path: '/name/host%20name%2Fwith%20slash',
    });
  });
});

describe('buildDiscoverEsqlUrl', () => {
  it('returns undefined when share is missing', () => {
    expect(buildDiscoverEsqlUrl({ esql: 'FROM logs-*' })).toBeUndefined();
  });

  it('returns undefined when locator is missing', () => {
    const share = {
      url: { locators: { get: () => undefined } },
    } as unknown as SharePluginStart;
    expect(buildDiscoverEsqlUrl({ share, esql: 'FROM logs-*' })).toBeUndefined();
  });

  it('returns undefined when esql is empty', () => {
    const share = {
      url: {
        locators: {
          get: () => ({ getRedirectUrl: jest.fn() }),
        },
      },
    } as unknown as SharePluginStart;
    expect(buildDiscoverEsqlUrl({ share, esql: '' })).toBeUndefined();
  });

  it('returns redirect url from DISCOVER_APP_LOCATOR with a wide default time range', () => {
    const getRedirectUrl = jest.fn().mockReturnValue('/app/discover#/?_a=esql');
    const share = {
      url: {
        locators: {
          get: (id: string) => (id === 'DISCOVER_APP_LOCATOR' ? { getRedirectUrl } : undefined),
        },
      },
    } as unknown as SharePluginStart;

    expect(buildDiscoverEsqlUrl({ share, esql: 'FROM logs-* | LIMIT 10' })).toBe(
      '/app/discover#/?_a=esql'
    );
    expect(getRedirectUrl).toHaveBeenCalledWith({
      query: { esql: 'FROM logs-* | LIMIT 10' },
      timeRange: DISCOVER_LOOKUP_TIME_RANGE,
    });
  });

  it('allows overriding the Discover time range', () => {
    const getRedirectUrl = jest.fn().mockReturnValue('/app/discover#/?_a=esql');
    const share = {
      url: {
        locators: {
          get: (id: string) => (id === 'DISCOVER_APP_LOCATOR' ? { getRedirectUrl } : undefined),
        },
      },
    } as unknown as SharePluginStart;
    const timeRange = { from: 'now-30d', to: 'now' };

    buildDiscoverEsqlUrl({ share, esql: 'FROM logs-*', timeRange });
    expect(getRedirectUrl).toHaveBeenCalledWith({
      query: { esql: 'FROM logs-*' },
      timeRange,
    });
  });
});

describe('buildDiscoverThreatReportNestedIocUrl', () => {
  it('returns undefined when share or value is missing', () => {
    expect(
      buildDiscoverThreatReportNestedIocUrl({ iocType: 'hash', value: 'abc' })
    ).toBeUndefined();
    const share = {
      url: { locators: { get: () => ({ getRedirectUrl: jest.fn() }) } },
    } as unknown as SharePluginStart;
    expect(
      buildDiscoverThreatReportNestedIocUrl({ share, iocType: 'hash', value: '  ' })
    ).toBeUndefined();
  });

  it('opens classic Discover with a nested extracted.iocs filter on threat reports', () => {
    const getRedirectUrl = jest.fn().mockReturnValue('/app/discover#/?_a=nested');
    const share = {
      url: {
        locators: {
          get: (id: string) => (id === 'DISCOVER_APP_LOCATOR' ? { getRedirectUrl } : undefined),
        },
      },
    } as unknown as SharePluginStart;

    const hash = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
    expect(buildDiscoverThreatReportNestedIocUrl({ share, iocType: 'hash', value: hash })).toBe(
      '/app/discover#/?_a=nested'
    );

    expect(getRedirectUrl).toHaveBeenCalledWith({
      dataViewSpec: {
        id: THREAT_REPORTS_LOOKUP_DATA_VIEW_ID,
        title: THREAT_REPORTS_INDEX_PATTERN,
        timeFieldName: '@timestamp',
        allowNoIndex: true,
        allowHidden: true,
      },
      timeRange: DISCOVER_LOOKUP_TIME_RANGE,
      query: { language: 'kuery', query: '' },
      filters: [
        {
          meta: {
            index: THREAT_REPORTS_LOOKUP_DATA_VIEW_ID,
            type: 'custom',
            disabled: false,
            negate: false,
            alias: null,
            key: 'extracted.iocs',
            value: `hash:${hash}`,
          },
          query: {
            nested: {
              path: 'extracted.iocs',
              query: {
                bool: {
                  filter: [
                    { term: { 'extracted.iocs.type': 'hash' } },
                    { term: { 'extracted.iocs.value': hash } },
                  ],
                },
              },
            },
          },
        },
      ],
    });
  });
});
