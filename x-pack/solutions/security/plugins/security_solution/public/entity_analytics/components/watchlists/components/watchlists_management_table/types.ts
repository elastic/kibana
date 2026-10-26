/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WatchlistObject } from '../../../../../../common/api/entity_analytics/watchlists/management/common.gen';

export type WatchlistTableItemType = WatchlistObject & {
  /** Derived display string for the entity source (e.g. "Entity Store" or "Index: my-index") */
  source?: string;
};
