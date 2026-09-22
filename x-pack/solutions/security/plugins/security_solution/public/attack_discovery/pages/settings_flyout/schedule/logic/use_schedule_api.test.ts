/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { useScheduleApi } from './use_schedule_api';
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

jest.mock('../../../../../common/lib/kibana');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

describe('useScheduleApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when the feature flag is ON but the per-space uiSetting is OFF', () => {
    beforeEach(() => {
      mockUseKibana.mockReturnValue({
        services: {
          featureFlags: {
            getBooleanValue: jest.fn().mockReturnValue(true),
          },
          uiSettings: {
            get: jest.fn().mockReturnValue(false),
          },
        },
      } as unknown as jest.Mocked<ReturnType<typeof useKibana>>);
    });

    it('returns isWorkflowsEnabled as false (FF on, setting off → legacy)', () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.isWorkflowsEnabled).toBe(false);
    });

    it('returns public API create hook when the uiSetting is off', () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.useCreateSchedule).toBe(useCreateAttackDiscoverySchedule);
    });

    it('does NOT return any workflow hooks when the uiSetting is off', () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.useCreateSchedule).not.toBe(useCreateWorkflowSchedule);
      expect(result.current.useDeleteSchedule).not.toBe(useDeleteWorkflowSchedule);
      expect(result.current.useEnableSchedule).not.toBe(useEnableWorkflowSchedule);
    });
  });

  describe('when the feature flag is OFF but the per-space uiSetting is ON', () => {
    beforeEach(() => {
      mockUseKibana.mockReturnValue({
        services: {
          featureFlags: {
            getBooleanValue: jest.fn().mockReturnValue(false),
          },
          uiSettings: {
            get: jest.fn().mockReturnValue(true),
          },
        },
      } as unknown as jest.Mocked<ReturnType<typeof useKibana>>);
    });

    it('returns isWorkflowsEnabled as false (FF off, setting on → legacy)', () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.isWorkflowsEnabled).toBe(false);
    });

    it('returns public API create hook when the feature flag is off', () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.useCreateSchedule).toBe(useCreateAttackDiscoverySchedule);
    });

    it('does NOT return any workflow hooks when the feature flag is off', () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.useCreateSchedule).not.toBe(useCreateWorkflowSchedule);
      expect(result.current.useDeleteSchedule).not.toBe(useDeleteWorkflowSchedule);
      expect(result.current.useEnableSchedule).not.toBe(useEnableWorkflowSchedule);
    });
  });

  describe('when attackDiscoveryWorkflowsEnabled is ON', () => {
    beforeEach(() => {
      mockUseKibana.mockReturnValue({
        services: {
          featureFlags: {
            getBooleanValue: jest.fn().mockReturnValue(true),
          },
          uiSettings: {
            get: jest.fn().mockReturnValue(true),
          },
        },
      } as unknown as jest.Mocked<ReturnType<typeof useKibana>>);
    });

    it('returns isWorkflowsEnabled as true', () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.isWorkflowsEnabled).toBe(true);
    });

    it('returns workflow create hook', () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.useCreateSchedule).toBe(useCreateWorkflowSchedule);
    });

    it('returns workflow delete hook', () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.useDeleteSchedule).toBe(useDeleteWorkflowSchedule);
    });

    it('returns workflow disable hook', () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.useDisableSchedule).toBe(useDisableWorkflowSchedule);
    });

    it('returns workflow enable hook', () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.useEnableSchedule).toBe(useEnableWorkflowSchedule);
    });

    it('returns workflow find hook', () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.useFindSchedules).toBe(useFindWorkflowSchedules);
    });

    it('returns workflow get hook', () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.useGetSchedule).toBe(useGetWorkflowSchedule);
    });

    it('returns workflow update hook', () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.useUpdateSchedule).toBe(useUpdateWorkflowSchedule);
    });

    it('returns workflow bulk enable hook', () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.useBulkEnableSchedules).toBe(useBulkEnableWorkflowSchedules);
    });

    it('returns workflow bulk disable hook', () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.useBulkDisableSchedules).toBe(useBulkDisableWorkflowSchedules);
    });

    it('returns workflow bulk delete hook', () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.useBulkDeleteSchedules).toBe(useBulkDeleteWorkflowSchedules);
    });

    it('returns the workflow hook set on the first render (no post-mount hook swap)', () => {
      const { result, rerender } = renderHook(() => useScheduleApi());

      const firstRender = result.current;

      rerender();

      expect(result.current).toBe(firstRender);
    });
  });

  describe('when attackDiscoveryWorkflowsEnabled is OFF', () => {
    beforeEach(() => {
      mockUseKibana.mockReturnValue({
        services: {
          featureFlags: {
            getBooleanValue: jest.fn().mockReturnValue(false),
          },
          uiSettings: {
            get: jest.fn().mockReturnValue(false),
          },
        },
      } as unknown as jest.Mocked<ReturnType<typeof useKibana>>);
    });

    it('returns isWorkflowsEnabled as false', () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.isWorkflowsEnabled).toBe(false);
    });

    it('returns public API create hook', () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.useCreateSchedule).toBe(useCreateAttackDiscoverySchedule);
    });

    it('returns public API delete hook', () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.useDeleteSchedule).toBe(useDeleteAttackDiscoverySchedule);
    });

    it('returns public API disable hook', () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.useDisableSchedule).toBe(useDisableAttackDiscoverySchedule);
    });

    it('returns public API enable hook', () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.useEnableSchedule).toBe(useEnableAttackDiscoverySchedule);
    });

    it('returns public API find hook', () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.useFindSchedules).toBe(useFindAttackDiscoverySchedules);
    });

    it('returns public API get hook', () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.useGetSchedule).toBe(useGetAttackDiscoverySchedule);
    });

    it('returns public API update hook', () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.useUpdateSchedule).toBe(useUpdateAttackDiscoverySchedule);
    });

    it('returns public API bulk enable hook', () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.useBulkEnableSchedules).toBe(useBulkEnableAttackDiscoverySchedules);
    });

    it('returns public API bulk disable hook', () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.useBulkDisableSchedules).toBe(useBulkDisableAttackDiscoverySchedules);
    });

    it('returns public API bulk delete hook', () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.useBulkDeleteSchedules).toBe(useBulkDeleteAttackDiscoverySchedules);
    });

    it('does NOT return any workflow hooks', () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.useCreateSchedule).not.toBe(useCreateWorkflowSchedule);
      expect(result.current.useDeleteSchedule).not.toBe(useDeleteWorkflowSchedule);
      expect(result.current.useDisableSchedule).not.toBe(useDisableWorkflowSchedule);
      expect(result.current.useEnableSchedule).not.toBe(useEnableWorkflowSchedule);
      expect(result.current.useFindSchedules).not.toBe(useFindWorkflowSchedules);
      expect(result.current.useGetSchedule).not.toBe(useGetWorkflowSchedule);
      expect(result.current.useUpdateSchedule).not.toBe(useUpdateWorkflowSchedule);
      expect(result.current.useBulkEnableSchedules).not.toBe(useBulkEnableWorkflowSchedules);
      expect(result.current.useBulkDisableSchedules).not.toBe(useBulkDisableWorkflowSchedules);
      expect(result.current.useBulkDeleteSchedules).not.toBe(useBulkDeleteWorkflowSchedules);
    });

    it('reads the feature flag with the correct key and a true default (ON by default)', () => {
      renderHook(() => useScheduleApi());

      const { getBooleanValue } = mockUseKibana().services.featureFlags;

      expect(getBooleanValue).toHaveBeenCalledWith(
        'securitySolution.attackDiscoveryWorkflowsEnabled',
        true
      );
    });
  });
});
