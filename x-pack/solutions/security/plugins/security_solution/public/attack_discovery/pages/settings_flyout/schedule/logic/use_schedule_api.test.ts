/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';

import { useScheduleApi } from './use_schedule_api';
import { useKibana } from '../../../../../common/lib/kibana';
import { useCreateAttackDiscoverySchedule } from './use_create_schedule';
import { useDeleteAttackDiscoverySchedule } from './use_delete_schedule';
import { useDisableAttackDiscoverySchedule } from './use_disable_schedule';
import { useEnableAttackDiscoverySchedule } from './use_enable_schedule';
import { useFindAttackDiscoverySchedules } from './use_find_schedules';
import { useGetAttackDiscoverySchedule } from './use_get_schedule';
import { useUpdateAttackDiscoverySchedule } from './use_update_schedule';
import { useCreateWorkflowSchedule } from './use_create_workflow_schedule';
import { useDeleteWorkflowSchedule } from './use_delete_workflow_schedule';
import { useDisableWorkflowSchedule } from './use_disable_workflow_schedule';
import { useEnableWorkflowSchedule } from './use_enable_workflow_schedule';
import { useFindWorkflowSchedules } from './use_find_workflow_schedules';
import { useGetWorkflowSchedule } from './use_get_workflow_schedule';
import { useUpdateWorkflowSchedule } from './use_update_workflow_schedule';

jest.mock('../../../../../common/lib/kibana');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

describe('useScheduleApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when attackDiscoveryWorkflowsEnabled is ON', () => {
    beforeEach(() => {
      mockUseKibana.mockReturnValue({
        services: {
          featureFlags: {
            getBooleanValue: jest.fn().mockResolvedValue(true),
          },
        },
      } as unknown as jest.Mocked<ReturnType<typeof useKibana>>);
    });

    it('returns isWorkflowsEnabled as true', async () => {
      const { result } = renderHook(() => useScheduleApi());

      await waitFor(() => {
        expect(result.current.isWorkflowsEnabled).toBe(true);
      });
    });

    it('returns workflow create hook', async () => {
      const { result } = renderHook(() => useScheduleApi());

      await waitFor(() => {
        expect(result.current.useCreateSchedule).toBe(useCreateWorkflowSchedule);
      });
    });

    it('returns workflow delete hook', async () => {
      const { result } = renderHook(() => useScheduleApi());

      await waitFor(() => {
        expect(result.current.useDeleteSchedule).toBe(useDeleteWorkflowSchedule);
      });
    });

    it('returns workflow disable hook', async () => {
      const { result } = renderHook(() => useScheduleApi());

      await waitFor(() => {
        expect(result.current.useDisableSchedule).toBe(useDisableWorkflowSchedule);
      });
    });

    it('returns workflow enable hook', async () => {
      const { result } = renderHook(() => useScheduleApi());

      await waitFor(() => {
        expect(result.current.useEnableSchedule).toBe(useEnableWorkflowSchedule);
      });
    });

    it('returns workflow find hook', async () => {
      const { result } = renderHook(() => useScheduleApi());

      await waitFor(() => {
        expect(result.current.useFindSchedules).toBe(useFindWorkflowSchedules);
      });
    });

    it('returns workflow get hook', async () => {
      const { result } = renderHook(() => useScheduleApi());

      await waitFor(() => {
        expect(result.current.useGetSchedule).toBe(useGetWorkflowSchedule);
      });
    });

    it('returns workflow update hook', async () => {
      const { result } = renderHook(() => useScheduleApi());

      await waitFor(() => {
        expect(result.current.useUpdateSchedule).toBe(useUpdateWorkflowSchedule);
      });
    });
  });

  describe('when attackDiscoveryWorkflowsEnabled is OFF', () => {
    beforeEach(() => {
      mockUseKibana.mockReturnValue({
        services: {
          featureFlags: {
            getBooleanValue: jest.fn().mockResolvedValue(false),
          },
        },
      } as unknown as jest.Mocked<ReturnType<typeof useKibana>>);
    });

    it('returns isWorkflowsEnabled as false', async () => {
      const { result } = renderHook(() => useScheduleApi());

      await waitFor(() => {
        expect(result.current.isWorkflowsEnabled).toBe(false);
      });
    });

    it('returns public API create hook', async () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.useCreateSchedule).toBe(useCreateAttackDiscoverySchedule);
    });

    it('returns public API delete hook', async () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.useDeleteSchedule).toBe(useDeleteAttackDiscoverySchedule);
    });

    it('returns public API disable hook', async () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.useDisableSchedule).toBe(useDisableAttackDiscoverySchedule);
    });

    it('returns public API enable hook', async () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.useEnableSchedule).toBe(useEnableAttackDiscoverySchedule);
    });

    it('returns public API find hook', async () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.useFindSchedules).toBe(useFindAttackDiscoverySchedules);
    });

    it('returns public API get hook', async () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.useGetSchedule).toBe(useGetAttackDiscoverySchedule);
    });

    it('returns public API update hook', async () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.useUpdateSchedule).toBe(useUpdateAttackDiscoverySchedule);
    });

    it('does NOT return any workflow hooks', async () => {
      const { result } = renderHook(() => useScheduleApi());

      expect(result.current.useCreateSchedule).not.toBe(useCreateWorkflowSchedule);
      expect(result.current.useDeleteSchedule).not.toBe(useDeleteWorkflowSchedule);
      expect(result.current.useDisableSchedule).not.toBe(useDisableWorkflowSchedule);
      expect(result.current.useEnableSchedule).not.toBe(useEnableWorkflowSchedule);
      expect(result.current.useFindSchedules).not.toBe(useFindWorkflowSchedules);
      expect(result.current.useGetSchedule).not.toBe(useGetWorkflowSchedule);
      expect(result.current.useUpdateSchedule).not.toBe(useUpdateWorkflowSchedule);
    });

    it('reads the feature flag with the correct key and default', () => {
      renderHook(() => useScheduleApi());

      const { getBooleanValue } = mockUseKibana().services.featureFlags;

      expect(getBooleanValue).toHaveBeenCalledWith(
        'securitySolution.attackDiscoveryWorkflowsEnabled',
        false
      );
    });
  });
});
