/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SharePluginStart } from '@kbn/share-plugin/public';
import {
  getStatesFromKbnUrl,
  hashedItemStore,
  setStateToKbnUrl,
} from '@kbn/kibana-utils-plugin/public';
import { mockStorage } from '@kbn/kibana-utils-plugin/public/storage/hashed_item_store/mock';
import { appLocatorGetLocationCommon } from '@kbn/discover-plugin/common/app_locator_get_location';
import { createProfileStateRegistry } from '@kbn/discover-plugin/common/context_awareness';
import {
  buildAlertDetailsUrl,
  buildDiscoverEsqlUrl,
  buildDiscoverThreatReportNestedIocUrl,
  buildSecurityEntityUrl,
  THREAT_REPORTS_LOOKUP_DATA_VIEW_ID,
  DISCOVER_LOOKUP_TIME_RANGE,
  DISCOVER_CONTINUATION_MAX_REDIRECT_URL_LENGTH,
} from './discover_urls';
import { THREAT_REPORTS_INDEX_PATTERN } from './esql_queries';

describe('buildAlertDetailsUrl', () => {
  const identityPrepend = (path: string) => path;

  it('builds a redirect path with the index and no timestamp when none is given', () => {
    expect(
      buildAlertDetailsUrl({
        prependPath: identityPrepend,
        spaceId: 'default',
        alertId: 'alert-1',
      })
    ).toBe('/app/security/alerts/redirect/alert-1?index=.alerts-security.alerts-default');
  });

  it('includes the timestamp query param when provided', () => {
    expect(
      buildAlertDetailsUrl({
        prependPath: identityPrepend,
        spaceId: 'default',
        alertId: 'alert-1',
        timestamp: '2023-04-20T12:00:00.000Z',
      })
    ).toBe(
      '/app/security/alerts/redirect/alert-1?index=.alerts-security.alerts-default&timestamp=2023-04-20T12%3A00%3A00.000Z'
    );
  });

  it('derives the index from spaceId and routes through the space base path', () => {
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
  it('builds a hosts deep link for a host.name field', () => {
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

  it('builds a users deep link for a user.name field', () => {
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

  it('returns undefined for id/email entity fields, which the name route cannot resolve', () => {
    const getUrlForApp = jest.fn();

    expect(
      buildSecurityEntityUrl({ getUrlForApp, field: 'host.id', value: 'host-euid-123' })
    ).toBeUndefined();
    expect(
      buildSecurityEntityUrl({ getUrlForApp, field: 'user.id', value: 'user-euid-123' })
    ).toBeUndefined();
    expect(
      buildSecurityEntityUrl({ getUrlForApp, field: 'user.email', value: 'dev@example.com' })
    ).toBeUndefined();
    expect(getUrlForApp).not.toHaveBeenCalled();
  });

  it('returns undefined when getUrlForApp is not provided', () => {
    expect(buildSecurityEntityUrl({ field: 'host.name', value: 'WIN-ANALYST01' })).toBeUndefined();
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

describe('buildDiscoverEsqlUrl continuation (useHash)', () => {
  const timeRange = { from: '2026-10-01T00:00:00.000Z', to: '2026-10-02T00:00:00.000Z' };

  const shareWith = (getRedirectUrl: jest.Mock) =>
    ({
      url: {
        locators: {
          get: (id: string) => (id === 'DISCOVER_APP_LOCATOR' ? { getRedirectUrl } : undefined),
        },
      },
    } as unknown as SharePluginStart);

  it('forwards the query, the absolute range and useHash, with no columns', () => {
    const getRedirectUrl = jest.fn().mockReturnValue('/app/r?l=DISCOVER_APP_LOCATOR');

    expect(
      buildDiscoverEsqlUrl({
        share: shareWith(getRedirectUrl),
        esql: 'FROM logs-* | LIMIT 10',
        timeRange,
        useHash: true,
      })
    ).toBe('/app/r?l=DISCOVER_APP_LOCATOR');
    expect(getRedirectUrl).toHaveBeenCalledWith({
      query: { esql: 'FROM logs-* | LIMIT 10' },
      timeRange,
      useHash: true,
    });
  });

  it('returns undefined for a whitespace-only query', () => {
    const getRedirectUrl = jest.fn();

    expect(
      buildDiscoverEsqlUrl({
        share: shareWith(getRedirectUrl),
        esql: '   ',
        timeRange,
        useHash: true,
      })
    ).toBeUndefined();
    expect(getRedirectUrl).not.toHaveBeenCalled();
  });

  it('forwards a padded non-blank query unchanged', () => {
    const getRedirectUrl = jest.fn().mockReturnValue('/app/r?x');
    const esql = '  FROM logs-*  ';

    buildDiscoverEsqlUrl({ share: shareWith(getRedirectUrl), esql, timeRange, useHash: true });

    expect(getRedirectUrl).toHaveBeenCalledWith(expect.objectContaining({ query: { esql } }));
  });

  it('keeps a redirect URL at the length cap and rejects one over it', () => {
    const atCap = '/app/r'.padEnd(DISCOVER_CONTINUATION_MAX_REDIRECT_URL_LENGTH, 'x');
    const overCap = `${atCap}x`;

    expect(
      buildDiscoverEsqlUrl({
        share: shareWith(jest.fn().mockReturnValue(atCap)),
        esql: 'FROM logs-*',
        timeRange,
        useHash: true,
      })
    ).toBe(atCap);
    expect(
      buildDiscoverEsqlUrl({
        share: shareWith(jest.fn().mockReturnValue(overCap)),
        esql: 'FROM logs-*',
        timeRange,
        useHash: true,
      })
    ).toBeUndefined();
  });

  it('does not apply the length cap without useHash', () => {
    const overCap = '/app/r'.padEnd(DISCOVER_CONTINUATION_MAX_REDIRECT_URL_LENGTH + 1, 'x');

    expect(
      buildDiscoverEsqlUrl({
        share: shareWith(jest.fn().mockReturnValue(overCap)),
        esql: 'FROM logs-*',
      })
    ).toBe(overCap);
  });

  it.each([
    ['an empty redirect', jest.fn().mockReturnValue('')],
    [
      'a serialization failure',
      jest.fn().mockImplementation(() => {
        throw new Error('boom');
      }),
    ],
  ])('returns undefined on %s', (_name, getRedirectUrl) => {
    expect(
      buildDiscoverEsqlUrl({
        share: shareWith(getRedirectUrl),
        esql: 'FROM logs-*',
        timeRange,
        useHash: true,
      })
    ).toBeUndefined();
  });

  it('returns undefined when the share locator is missing', () => {
    const share = {
      url: { locators: { get: () => undefined } },
    } as unknown as SharePluginStart;

    expect(
      buildDiscoverEsqlUrl({ share, esql: 'FROM logs-*', timeRange, useHash: true })
    ).toBeUndefined();
  });

  describe('with the real Discover locator serialization', () => {
    beforeEach(() => {
      // @ts-expect-error the store is swapped for an in-memory one, as Discover's own tests do
      hashedItemStore.storage = mockStorage;
    });

    it('serializes a large query that stays under the length cap', async () => {
      const esql = `FROM logs-* | WHERE message == "${'a'.repeat(4000)}" | LIMIT 10`;
      const params = { query: { esql }, timeRange, useHash: true };

      // Discover's own serialization of the exact params the helper sends. It throws if the
      // params cannot be serialized, and the hashed path resolves back to the full state.
      const { path } = await appLocatorGetLocationCommon(
        { useHash: true, setStateToKbnUrl, profileStateRegistry: createProfileStateRegistry() },
        params
      );
      const { _a, _g } = getStatesFromKbnUrl(path, ['_a', '_g']);
      expect(_a).toMatchObject({ query: { esql } });
      expect(_g).toEqual({ time: timeRange });

      const redirectUrl = `/app/r?l=DISCOVER_APP_LOCATOR&lv=1&p=${encodeURIComponent(
        JSON.stringify(params)
      )}`;
      const getRedirectUrl = jest.fn().mockReturnValue(redirectUrl);

      const url = buildDiscoverEsqlUrl({
        share: shareWith(getRedirectUrl),
        esql,
        timeRange,
        useHash: true,
      });

      expect(getRedirectUrl).toHaveBeenCalledWith(params);
      expect(url).toBe(redirectUrl);
      expect((url ?? '').length).toBeLessThanOrEqual(DISCOVER_CONTINUATION_MAX_REDIRECT_URL_LENGTH);
    });
  });
});

describe('buildDiscoverThreatReportNestedIocUrl', () => {
  it('returns undefined when share or value is missing', () => {
    expect(
      buildDiscoverThreatReportNestedIocUrl({ iocType: 'hash', value: 'abc', spaceId: 'default' })
    ).toBeUndefined();
    const share = {
      url: { locators: { get: () => ({ getRedirectUrl: jest.fn() }) } },
    } as unknown as SharePluginStart;
    expect(
      buildDiscoverThreatReportNestedIocUrl({
        share,
        iocType: 'hash',
        value: '  ',
        spaceId: 'default',
      })
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
    expect(
      buildDiscoverThreatReportNestedIocUrl({ share, iocType: 'hash', value: hash, spaceId: 'soc' })
    ).toBe('/app/discover#/?_a=nested');

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
        {
          meta: {
            index: THREAT_REPORTS_LOOKUP_DATA_VIEW_ID,
            type: 'phrases',
            key: 'space_id',
            disabled: false,
            negate: false,
            alias: null,
          },
          query: {
            bool: {
              minimum_should_match: 1,
              should: [{ match_phrase: { space_id: 'soc' } }, { match_phrase: { space_id: '*' } }],
            },
          },
        },
      ],
    });
  });
});
