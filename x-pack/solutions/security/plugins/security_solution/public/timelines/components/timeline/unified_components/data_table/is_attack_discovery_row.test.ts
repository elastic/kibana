/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils/types';
import {
  ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
  ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX,
  ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
} from '@kbn/elastic-assistant-common';
import { ALERT_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import type { TimelineItem } from '../../../../../../common/search_strategy';
import { isAttackDiscoveryRow } from './is_attack_discovery_row';

const ATTACK_DISCOVERY_ALERT_IDS_FIELD = 'kibana.alert.attack_discovery.alert_ids';

const createEventData = (
  overrides: Partial<DataTableRecord & TimelineItem> = {}
): DataTableRecord & TimelineItem =>
  ({
    data: [],
    ecs: {},
    ...overrides,
  } as DataTableRecord & TimelineItem);

describe('isAttackDiscoveryRow', () => {
  it('returns true when attack discovery alert ids are present', () => {
    const eventData = createEventData({
      data: [{ field: ATTACK_DISCOVERY_ALERT_IDS_FIELD, value: ['alert-id'] }],
    });

    expect(isAttackDiscoveryRow(eventData)).toBe(true);
  });

  it('returns true when the rule type is attack discovery', () => {
    const eventData = createEventData({
      data: [{ field: ALERT_RULE_TYPE_ID, value: [ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID] }],
    });

    expect(isAttackDiscoveryRow(eventData)).toBe(true);
  });

  it('returns true for ad hoc attack discovery rule type', () => {
    const eventData = createEventData({
      data: [{ field: ALERT_RULE_TYPE_ID, value: [ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID] }],
    });

    expect(isAttackDiscoveryRow(eventData)).toBe(true);
  });

  it('returns false when only index name matches attack discovery prefix', () => {
    const eventData = createEventData({
      ecs: { _id: 'event-id', _index: `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-000001` },
    });

    expect(isAttackDiscoveryRow(eventData)).toBe(false);
  });
});
