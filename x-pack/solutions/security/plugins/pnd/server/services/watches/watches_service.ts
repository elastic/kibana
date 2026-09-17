/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Catalog grouping for Watches. A Watch stores no settings; member Workers are listed separately.
 */

import {
  SYSTEM_SECURITY_WATCH_IDS,
  compareWatchesForDisplay,
  createCatalogWatchPlaceholder,
  GetWatchResponse,
  ListWatchesResponse,
} from '@kbn/pnd-common';

export class WatchesService {
  async list(_spaceId: string): Promise<ListWatchesResponse> {
    const watches = SYSTEM_SECURITY_WATCH_IDS.map((id) => createCatalogWatchPlaceholder(id));
    return ListWatchesResponse.parse({ watches: watches.sort(compareWatchesForDisplay) });
  }

  async get(watchId: string, _spaceId: string): Promise<GetWatchResponse | undefined> {
    if (!(SYSTEM_SECURITY_WATCH_IDS as readonly string[]).includes(watchId)) {
      return undefined;
    }
    return GetWatchResponse.parse({
      watch: createCatalogWatchPlaceholder(watchId as (typeof SYSTEM_SECURITY_WATCH_IDS)[number]),
    });
  }
}
