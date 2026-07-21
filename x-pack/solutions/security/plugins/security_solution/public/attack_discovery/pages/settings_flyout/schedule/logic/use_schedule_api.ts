/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { useKibana } from '../../../../../common/lib/kibana';
import { useCreateAttackDiscoverySchedule } from './use_create_schedule';
import { useDeleteAttackDiscoverySchedule } from './use_delete_schedule';
import { useDisableAttackDiscoverySchedule } from './use_disable_schedule';
import { useEnableAttackDiscoverySchedule } from './use_enable_schedule';
import { useFindAttackDiscoverySchedules } from './use_find_schedules';
import { useGetAttackDiscoverySchedule } from './use_get_schedule';
import { useUpdateAttackDiscoverySchedule } from './use_update_schedule';
import { useBulkEnableAttackDiscoverySchedules } from './use_bulk_enable_schedules';
import { useBulkDisableAttackDiscoverySchedules } from './use_bulk_disable_schedules';
import { useBulkDeleteAttackDiscoverySchedules } from './use_bulk_delete_schedules';
import { useCreateWorkflowSchedule } from './use_create_workflow_schedule';
import { useDeleteWorkflowSchedule } from './use_delete_workflow_schedule';
import { useDisableWorkflowSchedule } from './use_disable_workflow_schedule';
import { useEnableWorkflowSchedule } from './use_enable_workflow_schedule';
import { useFindWorkflowSchedules } from './use_find_workflow_schedules';
import { useGetWorkflowSchedule } from './use_get_workflow_schedule';
import { useUpdateWorkflowSchedule } from './use_update_workflow_schedule';
import { useBulkEnableWorkflowSchedules } from './use_bulk_enable_workflow_schedules';
import { useBulkDisableWorkflowSchedules } from './use_bulk_disable_workflow_schedules';
import { useBulkDeleteWorkflowSchedules } from './use_bulk_delete_workflow_schedules';

export interface ScheduleApi {
  isWorkflowsEnabled: boolean;
  useBulkDeleteSchedules:
    | typeof useBulkDeleteAttackDiscoverySchedules
    | typeof useBulkDeleteWorkflowSchedules;
  useBulkDisableSchedules:
    | typeof useBulkDisableAttackDiscoverySchedules
    | typeof useBulkDisableWorkflowSchedules;
  useBulkEnableSchedules:
    | typeof useBulkEnableAttackDiscoverySchedules
    | typeof useBulkEnableWorkflowSchedules;
  useCreateSchedule: typeof useCreateAttackDiscoverySchedule | typeof useCreateWorkflowSchedule;
  useDeleteSchedule: typeof useDeleteAttackDiscoverySchedule | typeof useDeleteWorkflowSchedule;
  useDisableSchedule: typeof useDisableAttackDiscoverySchedule | typeof useDisableWorkflowSchedule;
  useEnableSchedule: typeof useEnableAttackDiscoverySchedule | typeof useEnableWorkflowSchedule;
  useFindSchedules: typeof useFindAttackDiscoverySchedules | typeof useFindWorkflowSchedules;
  useGetSchedule: typeof useGetAttackDiscoverySchedule | typeof useGetWorkflowSchedule;
  useUpdateSchedule: typeof useUpdateAttackDiscoverySchedule | typeof useUpdateWorkflowSchedule;
}

/**
 * Reads the `attackDiscoveryWorkflowsEnabled` feature flag and returns
 * the correct set of CRUD hooks. When the flag is ON, the hooks target the
 * internal `discoveries` schedule API at `/internal/attack_discovery/schedules`;
 * when OFF they target the public `elastic_assistant` schedule API.
 *
 * NOTE: The "workflow" hooks returned when the flag is ON (e.g. `useCreateWorkflowSchedule`)
 * have misleading names — despite the "workflow" prefix, the internal API now creates
 * alerting rules (not workflow definitions). This naming is a historical artifact; renaming
 * is deferred to a follow-up PR (Option C: Hybrid Scheduling Migration).
 */
export const useScheduleApi = (): ScheduleApi => {
  const { featureFlags } = useKibana().services;

  // Read the flag synchronously during render so the returned hook set is stable
  // from the first render. Reading it asynchronously (useEffect + useState) would
  // swap the returned hooks after mount when the flag is ON, violating the Rules
  // of Hooks in consumers that call these hooks by identity.
  const isWorkflowsEnabled = featureFlags.getBooleanValue(
    'securitySolution.attackDiscoveryWorkflowsEnabled',
    false
  );

  return useMemo(
    () => ({
      isWorkflowsEnabled,
      useBulkDeleteSchedules: isWorkflowsEnabled
        ? useBulkDeleteWorkflowSchedules
        : useBulkDeleteAttackDiscoverySchedules,
      useBulkDisableSchedules: isWorkflowsEnabled
        ? useBulkDisableWorkflowSchedules
        : useBulkDisableAttackDiscoverySchedules,
      useBulkEnableSchedules: isWorkflowsEnabled
        ? useBulkEnableWorkflowSchedules
        : useBulkEnableAttackDiscoverySchedules,
      useCreateSchedule: isWorkflowsEnabled
        ? useCreateWorkflowSchedule
        : useCreateAttackDiscoverySchedule,
      useDeleteSchedule: isWorkflowsEnabled
        ? useDeleteWorkflowSchedule
        : useDeleteAttackDiscoverySchedule,
      useDisableSchedule: isWorkflowsEnabled
        ? useDisableWorkflowSchedule
        : useDisableAttackDiscoverySchedule,
      useEnableSchedule: isWorkflowsEnabled
        ? useEnableWorkflowSchedule
        : useEnableAttackDiscoverySchedule,
      useFindSchedules: isWorkflowsEnabled
        ? useFindWorkflowSchedules
        : useFindAttackDiscoverySchedules,
      useGetSchedule: isWorkflowsEnabled ? useGetWorkflowSchedule : useGetAttackDiscoverySchedule,
      useUpdateSchedule: isWorkflowsEnabled
        ? useUpdateWorkflowSchedule
        : useUpdateAttackDiscoverySchedule,
    }),
    [isWorkflowsEnabled]
  );
};
