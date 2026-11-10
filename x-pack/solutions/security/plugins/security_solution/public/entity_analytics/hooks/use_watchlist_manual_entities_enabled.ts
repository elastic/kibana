/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_ANALYTICS_WATCHLIST_MANUAL_ENTITIES_FLAG } from '../../../common/constants';
import { useKibana } from '../../common/lib/kibana';

/**
 * Whether entities can be added to a watchlist by hand and removed again. Off by default: the
 * fallback below is what on-prem deployments, which never reach LaunchDarkly, resolve to.
 */
export const useWatchlistManualEntitiesEnabled = (): boolean => {
  const { featureFlags } = useKibana().services;
  return featureFlags.useBooleanValue(ENTITY_ANALYTICS_WATCHLIST_MANUAL_ENTITIES_FLAG, false);
};
