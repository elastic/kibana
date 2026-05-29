/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCreateAttackDiscoverySchedule } from './use_create_schedule';
import { useDeleteAttackDiscoverySchedule } from './use_delete_schedule';
import { useDisableAttackDiscoverySchedule } from './use_disable_schedule';
import { useEnableAttackDiscoverySchedule } from './use_enable_schedule';
import { useFindAttackDiscoverySchedules } from './use_find_schedules';

// Aggregates the schedule API hooks behind a single accessor so consumers do not
// depend on the concrete (public) hooks directly. The workflows-backed
// implementation that switches on `isWorkflowsEnabled` is added by the Schedule
// Integration PR (PR10). Until then this returns the existing public schedule
// hooks with `isWorkflowsEnabled: false`. FF-off safe: the schedule tab that
// consumes this is only rendered when the feature flag is ON.
export const useScheduleApi = (): {
  isWorkflowsEnabled: boolean;
  useCreateSchedule: typeof useCreateAttackDiscoverySchedule;
  useDeleteSchedule: typeof useDeleteAttackDiscoverySchedule;
  useDisableSchedule: typeof useDisableAttackDiscoverySchedule;
  useEnableSchedule: typeof useEnableAttackDiscoverySchedule;
  useFindSchedules: typeof useFindAttackDiscoverySchedules;
} => ({
  isWorkflowsEnabled: false,
  useCreateSchedule: useCreateAttackDiscoverySchedule,
  useDeleteSchedule: useDeleteAttackDiscoverySchedule,
  useDisableSchedule: useDisableAttackDiscoverySchedule,
  useEnableSchedule: useEnableAttackDiscoverySchedule,
  useFindSchedules: useFindAttackDiscoverySchedules,
});
