/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import { ALERT_RULE_TYPE_ID, EVENT_KIND } from '@kbn/rule-data-utils';
import {
  ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
  ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
} from '@kbn/elastic-assistant-common';
import { EventKind } from '../../document/main/constants/event_kinds';

/**
 * Returns `true` when the given hit is an attack discovery document. Detection is based on the
 * alert's rule type id (scheduled or ad-hoc attack-discovery rule type) alongside `event.kind:
 * signal`, rather than the presence of a display field like the attack title: attack discoveries
 * are persisted as alerts, so this is the same signal the rest of the platform uses (mirrors
 * Discover's `isAttackDocument`) and won't misfire on a missing title.
 */
export const isAttackDocument = (hit: DataTableRecord): boolean => {
  const eventKind = getFieldValue(hit, EVENT_KIND) as string | undefined;
  const ruleTypeId = getFieldValue(hit, ALERT_RULE_TYPE_ID) as string | undefined;

  return (
    eventKind === EventKind.signal &&
    (ruleTypeId === ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID ||
      ruleTypeId === ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID)
  );
};
