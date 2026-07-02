/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Core logic lives in the flyout_v2 location so it can be used without legacy context.
// This file is kept as a backward-compat wrapper for legacy consumers in flyout/attack_details/.
export type {
  AttackEntityListEntry,
  UseAttackEntitiesListsResult,
} from '../../../flyout_v2/attack/tools/entities/hooks/use_attack_entities_lists';
import {
  useAttackEntitiesLists as useAttackEntitiesListsCore,
  type UseAttackEntitiesListsResult,
} from '../../../flyout_v2/attack/tools/entities/hooks/use_attack_entities_lists';
import { useOriginalAlertIds } from './use_original_alert_ids';

/**
 * Zero-argument wrapper for legacy consumers that get alert IDs from `useAttackDetailsContext()`.
 * New code should use `useAttackEntitiesLists(originalAlertIds)` from the flyout_v2 location directly.
 */
export const useAttackEntitiesLists = (): UseAttackEntitiesListsResult => {
  const originalAlertIds = useOriginalAlertIds();
  return useAttackEntitiesListsCore(originalAlertIds);
};
