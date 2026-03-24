/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';

import type { AttackDiscoveryResponse } from '@kbn/elastic-assistant-common';

/**
 * Depreciated: Returns a (placeholder) AttackDiscoveryResponse for API compatibility
 * with the depreciated internal API. This placeholder will be removed, along with the
 * internal API, in a future release.
 */
export const generateDepreciatedInternalApiResponse = (): AttackDiscoveryResponse => {
  const now = new Date().toISOString();
  const id = uuidv4();

  return {
    alertsContextCount: 0,
    apiConfig: {
      actionTypeId: '',
      connectorId: '',
    },
    attackDiscoveries: [],
    averageIntervalMs: 0,
    backingIndex: '',
    createdAt: now,
    generationIntervals: [],
    id,
    lastViewedAt: now,
    namespace: '',
    status: 'running',
    timestamp: now,
    updatedAt: now,
    users: [],
  };
};
