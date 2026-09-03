/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX,
  ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX,
} from '@kbn/elastic-assistant-common';

export const isAttackDiscoveryIndex = (index: string): boolean => {
  const normalized = index.startsWith('.internal.') ? index.replace('.internal.', '.') : index;
  return (
    normalized.startsWith(ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX) ||
    normalized.startsWith(ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX)
  );
};
