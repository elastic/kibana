/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DISCOVER_APP_LOCATOR } from '@kbn/discover-plugin/common';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { getEsqlDiscoverUrl } from './open_esql_in_discover';

const buildShare = (redirectUrl?: string): SharePluginStart =>
  ({
    url: {
      locators: {
        get: (id: string) =>
          id === DISCOVER_APP_LOCATOR
            ? { getRedirectUrl: jest.fn().mockReturnValue(redirectUrl) }
            : undefined,
      },
    },
  }) as unknown as SharePluginStart;

describe('getEsqlDiscoverUrl', () => {
  it('returns undefined when the query is blank', () => {
    expect(getEsqlDiscoverUrl(buildShare('/discover'), '   ')).toBeUndefined();
  });

  it('returns undefined when share is missing', () => {
    expect(getEsqlDiscoverUrl(undefined, 'FROM logs')).toBeUndefined();
  });

  it('returns the Discover redirect URL for a valid ES|QL query', () => {
    expect(getEsqlDiscoverUrl(buildShare('/app/discover#/?q=from'), 'FROM logs')).toBe(
      '/app/discover#/?q=from'
    );
  });
});
