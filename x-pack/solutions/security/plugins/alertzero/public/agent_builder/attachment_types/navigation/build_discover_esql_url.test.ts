/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildDiscoverEsqlUrl } from './build_discover_esql_url';
import { DISCOVER_LOOKUP_TIME_RANGE } from './constants';
import type { SharePluginStart } from '@kbn/share-plugin/public';

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
