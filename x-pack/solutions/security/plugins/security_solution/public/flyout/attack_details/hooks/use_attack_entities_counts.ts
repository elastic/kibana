/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useOriginalAlertIds } from './use_original_alert_ids';
import { useAttackEntitiesCounts as useAttackEntitiesCountsV2 } from '../../../flyout_v2/attack/main/hooks/use_attack_entities_counts';

export type { UseAttackEntitiesCountsResult } from '../../../flyout_v2/attack/main/hooks/use_attack_entities_counts';

/**
 * Reads the alert IDs from context and returns distinct user and host counts
 * across all alerts that belong to the current attack.
 */
export const useAttackEntitiesCounts = () => {
  const alertIds = useOriginalAlertIds();
  return useAttackEntitiesCountsV2(alertIds);
};
