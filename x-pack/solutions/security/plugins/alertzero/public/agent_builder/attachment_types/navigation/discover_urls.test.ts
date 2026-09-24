/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SharePluginStart } from '@kbn/share-plugin/public';
import {
  buildDiscoverEsqlUrl,
  buildDiscoverThreatReportNestedIocUrl,
  THREAT_REPORTS_LOOKUP_DATA_VIEW_ID,
  DISCOVER_LOOKUP_TIME_RANGE,
} from './discover_urls';
import { THREAT_REPORTS_INDEX_PATTERN } from './esql_queries';

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
