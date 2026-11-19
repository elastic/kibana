/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ATTACK_DISCOVERY_EVENT_SERVICE_ACCOUNT_TAG } from './constants';
import { getAttackDiscoveryEventOwnerFilter } from './get_attack_discovery_event_owner_filter';

describe('getAttackDiscoveryEventOwnerFilter', () => {
  it("matches the user's own events or events written by a service account", () => {
    expect(getAttackDiscoveryEventOwnerFilter('test_user')).toEqual({
      bool: {
        minimum_should_match: 1,
        should: [
          { term: { 'user.name': 'test_user' } },
          { term: { tags: ATTACK_DISCOVERY_EVENT_SERVICE_ACCOUNT_TAG } },
        ],
      },
    });
  });
});
