/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SharePluginStart } from '@kbn/share-plugin/public';

export const buildDiscoverEsqlUrl = ({
  share,
  esql,
}: {
  share?: SharePluginStart;
  esql: string;
}): string | undefined => {
  if (!share || !esql) {
    return undefined;
  }

  const locator = share.url.locators.get('DISCOVER_APP_LOCATOR');
  return locator?.getRedirectUrl({ query: { esql } });
};
