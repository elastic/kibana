/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID } from '@kbn/elastic-assistant-common';

export const dsl = {
  isAttack: (): estypes.QueryDslQueryContainer => ({
    term: { 'kibana.alert.rule.rule_type_id': ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID },
  }),
  isNotAttack: (): estypes.QueryDslQueryContainer => ({
    bool: { must_not: dsl.isAttack() },
  }),
};
