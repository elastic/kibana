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

const ATTACK_DISCOVERY_ALERT_IDS_FIELD = 'kibana.alert.attack_discovery.alert_ids';
const ATTACK_DISCOVERY_RULE_TYPE_IDS = [
  ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
  ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
] as const;
const ATTACK_DISCOVERY_RULE_TYPES = new Set<string>(ATTACK_DISCOVERY_RULE_TYPE_IDS);

const getTimelineFieldValues = (
  eventData: DataTableRecord & TimelineItem,
  fieldName: string
): string[] => {
  const timelineField = eventData.data.find(({ field }) => field === fieldName);
  return timelineField?.value?.filter((value): value is string => value != null) ?? [];
};

export const isAttackDiscoveryRow = (eventData: DataTableRecord & TimelineItem): boolean => {
  const attackAlertIds = getTimelineFieldValues(eventData, ATTACK_DISCOVERY_ALERT_IDS_FIELD);
  if (attackAlertIds.length > 0) {
    return true;
  }

  const ruleTypeIds = getTimelineFieldValues(eventData, ALERT_RULE_TYPE_ID);
  if (ruleTypeIds.some((ruleTypeId) => ATTACK_DISCOVERY_RULE_TYPES.has(ruleTypeId))) {
    return true;
  }

  const indexName = eventData.ecs._index ?? '';
  return indexName.includes(ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX);
};
