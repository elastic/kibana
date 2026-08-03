/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DISCOVER_APP_LOCATOR } from '@kbn/discover-plugin/common';
import type { SharePluginStart } from '@kbn/share-plugin/public';

/**
 * Build a Discover deep-link URL that opens with the given ES|QL query
 * preloaded. Returns undefined when the Discover locator is unavailable.
 */
export const getEsqlDiscoverUrl = (
  share: SharePluginStart | undefined,
  esql: string
): string | undefined => {
  const trimmed = esql.trim();
  if (!trimmed || !share) {
    return undefined;
  }

  const discoverLocator = share.url.locators.get(DISCOVER_APP_LOCATOR);
  if (!discoverLocator) {
    return undefined;
  }

  return discoverLocator.getRedirectUrl({
    query: { esql: trimmed },
  });
};
