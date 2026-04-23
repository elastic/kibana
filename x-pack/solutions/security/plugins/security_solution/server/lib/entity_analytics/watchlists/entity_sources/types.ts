/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type { EntityType } from '@kbn/entity-store/common';

export interface WatchlistBulkEntity {
  euid: string;
  type: EntityType;
  name?: string;
  sourceId: string;
  existingEntityId?: string;
  /** Current watchlist names from the entity store, used for store sync */
  currentWatchlists?: string[];
}

export interface BulkItemOutcome<T> {
  succeeded: readonly T[];
  failed: readonly { entity: T; item: BulkResponse['items'][number]; error: string }[];
}
