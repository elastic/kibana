/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DiscoverInternalState,
  DiscoverAppState,
} from '@kbn/discover-plugin/public/application/main/state_management/redux';
import type { SavedSearch } from '@kbn/saved-search-plugin/common';

export interface SecuritySolutionDiscoverState {
  app: DiscoverAppState | undefined;
  internal: DiscoverInternalState | undefined;
  savedSearch: SavedSearch | undefined;
}

export const initialDiscoverAppState: SecuritySolutionDiscoverState = {
  app: undefined,
  internal: undefined,
  savedSearch: undefined,
};
