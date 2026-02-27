/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX } from '@kbn/elastic-assistant-common';

import { getScheduledIndexPattern } from '.';

describe('getScheduledIndexPattern', () => {
  it('returns the expected scheduled index pattern for a given spaceId', () => {
    const spaceId = 'test-space';
    const result = getScheduledIndexPattern(spaceId);
    expect(result).toBe(`${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-test-space`);
  });

  it('returns the expected pattern for empty spaceId', () => {
    const result = getScheduledIndexPattern('');
    expect(result).toBe(`${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-`);
  });
});
