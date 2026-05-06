/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import {
  ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
  ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
} from '@kbn/elastic-assistant-common';
import { ALERT_RULE_TYPE_ID } from '@kbn/rule-data-utils';

import { isAttackDiscoveryHit } from './is_attack_discovery_hit';

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened,
    isAnchor: false,
  } as DataTableRecord);

describe('isAttackDiscoveryHit', () => {
  it('returns true for attack-discovery scheduled alerts', () => {
    const hit = createMockHit({
      [ALERT_RULE_TYPE_ID]: ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
    });

    expect(isAttackDiscoveryHit(hit)).toBe(true);
  });

  it('returns true for attack-discovery ad-hoc alerts', () => {
    const hit = createMockHit({
      [ALERT_RULE_TYPE_ID]: ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
    });

    expect(isAttackDiscoveryHit(hit)).toBe(true);
  });

  it('returns false for regular detection alerts', () => {
    const hit = createMockHit({
      [ALERT_RULE_TYPE_ID]: 'siem.queryRule',
    });

    expect(isAttackDiscoveryHit(hit)).toBe(false);
  });

  it('returns false when the rule type id is missing', () => {
    const hit = createMockHit({});

    expect(isAttackDiscoveryHit(hit)).toBe(false);
  });
});
