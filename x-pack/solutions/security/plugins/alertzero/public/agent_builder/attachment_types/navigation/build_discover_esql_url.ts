/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';
import { DISCOVER_LOOKUP_TIME_RANGE } from './constants';

export interface DiscoverLookupTimeRange {
  from: string;
  to: string;
}

export const buildDiscoverEsqlUrl = ({
  share,
  esql,
  timeRange = DISCOVER_LOOKUP_TIME_RANGE,
}: {
  share?: SharePluginStart;
  esql: string;
  /** Defaults to a wide window so historic reports / events are not filtered out. */
  timeRange?: DiscoverLookupTimeRange;
}): string | undefined => {
  if (!share || !esql) {
    return undefined;
  }

  const locator = share.url.locators.get('DISCOVER_APP_LOCATOR');
  // Locator params are typed as SerializableRecord; from/to time ranges are plain strings.
  return locator?.getRedirectUrl({
    query: { esql },
    timeRange: {
      from: timeRange.from,
      to: timeRange.to,
    },
  } as SerializableRecord);
};
