/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import { ATTACK_DISCOVERY_EVENT_SERVICE_ACCOUNT_TAG } from './constants';

/**
 * Matches the Attack Discovery events a user may read: their own, plus events written by a
 * service account (e.g. an AlertZero Worker), which no user owns.
 *
 * Callers still bound the query to a space. `generation-dismissed` events are never tagged, so a
 * dismissal stays private to whoever dismissed the generation.
 */
export const getAttackDiscoveryEventOwnerFilter = (
  username: string
): estypes.QueryDslQueryContainer => ({
  bool: {
    minimum_should_match: 1,
    should: [
      { term: { 'user.name': username } },
      { term: { tags: ATTACK_DISCOVERY_EVENT_SERVICE_ACCOUNT_TAG } },
    ],
  },
});
