/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { ALERT_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import {
  ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
  ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
} from '@kbn/elastic-assistant-common';

const ATTACK_DISCOVERY_RULE_TYPES = new Set<string>([
  ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
  ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
]);

/**
 * Returns true when the document hit corresponds to an attack-discovery alert,
 * detected via its `kibana.alert.rule.type_id` matching the attack-discovery
 * scheduled or ad-hoc rule type. Mirrors the canonical detection used by
 * {@link timelines/components/timeline/unified_components/data_table/is_attack_discovery_row}
 * but accepts the `DataTableRecord` shape used by the v2 document flyout.
 */
export const isAttackDiscoveryHit = (hit: DataTableRecord): boolean => {
  const ruleTypeId = getFieldValue(hit, ALERT_RULE_TYPE_ID) as string | undefined;
  return ruleTypeId != null && ATTACK_DISCOVERY_RULE_TYPES.has(ruleTypeId);
};
