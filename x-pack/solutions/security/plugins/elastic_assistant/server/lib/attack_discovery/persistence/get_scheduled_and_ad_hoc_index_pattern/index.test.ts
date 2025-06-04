/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ruleRegistryMocks } from '@kbn/rule-registry-plugin/server/mocks';
import { ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX } from '@kbn/elastic-assistant-common';

import { getScheduledAndAdHocIndexPattern } from '.';

const ADHOC_ALERTS_INDEX = '.adhoc.alerts-security.attack.discovery.alerts' as const;
const ruleDataClientMock = ruleRegistryMocks.createRuleDataClient(ADHOC_ALERTS_INDEX);

describe('getScheduledAndAdHocIndexPattern', () => {
  it('returns the expected pattern for the `default` spaceId', () => {
    const spaceId = 'default';

    const result = getScheduledAndAdHocIndexPattern(spaceId, ruleDataClientMock);

    expect(result).toBe(
      `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-default,${ADHOC_ALERTS_INDEX}-default`
    );
  });

  it('returns the expected pattern for a non-default spaceId', () => {
    const spaceId = 'another-space';

    const result = getScheduledAndAdHocIndexPattern(spaceId, ruleDataClientMock);

    expect(result).toBe(
      `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-another-space,${ADHOC_ALERTS_INDEX}-another-space`
    );
  });

  it('returns the expected pattern when rule data client does not exist', () => {
    const spaceId = 'test-space';

    const result = getScheduledAndAdHocIndexPattern(spaceId);

    expect(result).toBe(`${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-test-space`);
  });
});
