/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useAttackDetailsAssignees } from './use_attack_details_assignees';
import { useAttackDetailsContext } from '../context';
import { useHeaderData } from './use_header_data';
import { useInvalidateFindAttackDiscoveries } from '../../../attack_discovery/pages/use_find_attack_discoveries';
import { useApplyAttackAssignees } from '../../../detections/hooks/attacks/bulk_actions/apply_actions/use_apply_attack_assignees';
import { useAttacksPrivileges } from '../../../detections/hooks/attacks/bulk_actions/use_attacks_privileges';
import { useLicense } from '../../../common/hooks/use_license';
import { useUpsellingMessage } from '../../../common/hooks/use_upselling';

jest.mock('../context');
jest.mock('./use_header_data');
jest.mock('../../../attack_discovery/pages/use_find_attack_discoveries');
jest.mock(
  '../../../detections/hooks/attacks/bulk_actions/apply_actions/use_apply_attack_assignees'
);
jest.mock('../../../detections/hooks/attacks/bulk_actions/use_attacks_privileges');
jest.mock('../../../common/hooks/use_license');
jest.mock('../../../common/hooks/use_upselling');
jest.mock('../../../common/components/user_profiles/use_bulk_get_user_profiles', () => ({
  useBulkGetUserProfiles: () => ({ data: undefined }),
}));

const mockUseAttackDetailsContext = useAttackDetailsContext as jest.MockedFunction<
  typeof useAttackDetailsContext
>;
const mockUseHeaderData = useHeaderData as jest.MockedFunction<typeof useHeaderData>;
const mockUseInvalidateFindAttackDiscoveries =
  useInvalidateFindAttackDiscoveries as jest.MockedFunction<
    typeof useInvalidateFindAttackDiscoveries
  >;
const mockUseApplyAttackAssignees = useApplyAttackAssignees as jest.MockedFunction<
  typeof useApplyAttackAssignees
>;
const mockUseAttacksPrivileges = useAttacksPrivileges as jest.MockedFunction<
  typeof useAttacksPrivileges
>;
const mockUseLicense = useLicense as jest.MockedFunction<typeof useLicense>;
const mockUseUpsellingMessage = useUpsellingMessage as jest.MockedFunction<
  typeof useUpsellingMessage
>;

describe('useAttackDetailsAssignees', () => {
  const mockRefetch = jest.fn();
  const mockInvalidateFindAttackDiscoveries = jest.fn();
  const mockApplyAssignees = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAttackDetailsContext.mockReturnValue({
      attackId: 'attack-123',
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useAttackDetailsContext>);
    mockUseHeaderData.mockReturnValue({
      alertIds: ['alert-1', 'alert-2'],
      assignees: ['uid-1'],
    } as ReturnType<typeof useHeaderData>);
    mockUseInvalidateFindAttackDiscoveries.mockReturnValue(mockInvalidateFindAttackDiscoveries);
    mockUseApplyAttackAssignees.mockReturnValue({
      applyAssignees: mockApplyAssignees,
    });
    mockUseAttacksPrivileges.mockReturnValue({
      hasIndexWrite: true,
      hasAttackIndexWrite: true,
      loading: false,
    });
    mockUseLicense.mockReturnValue({
      isPlatinumPlus: () => true,
    } as ReturnType<typeof useLicense>);
    mockUseUpsellingMessage.mockReturnValue(undefined);
  });

  it('returns assignedUserIds and hasPermission from context and header data', () => {
    const { result } = renderHook(() => useAttackDetailsAssignees());

    expect(result.current.assignedUserIds).toEqual(['uid-1']);
    expect(result.current.hasPermission).toBe(true);
    expect(result.current.isPlatinumPlus).toBe(true);
  });

  it('calls applyAssignees with attackId, alertIds, and onSuccess that triggers refetch and invalidate', async () => {
    let capturedOnSuccess: (() => void) | undefined;
    mockApplyAssignees.mockImplementation(async ({ onSuccess }) => {
      capturedOnSuccess = onSuccess;
    });

    const { result } = renderHook(() => useAttackDetailsAssignees());

    await act(async () => {
      await result.current.onApplyAssignees({ add: ['uid-2'], remove: [] });
    });

    expect(mockApplyAssignees).toHaveBeenCalledWith(
      expect.objectContaining({
        assignees: { add: ['uid-2'], remove: [] },
        attackIds: ['attack-123'],
        relatedAlertIds: ['alert-1', 'alert-2'],
      })
    );
    expect(capturedOnSuccess).toBeDefined();

    await act(async () => {
      capturedOnSuccess?.();
    });

    expect(mockRefetch).toHaveBeenCalled();
    expect(mockInvalidateFindAttackDiscoveries).toHaveBeenCalled();
  });

  it('returns hasPermission false when privileges are not granted', () => {
    mockUseAttacksPrivileges.mockReturnValue({
      hasIndexWrite: false,
      hasAttackIndexWrite: true,
      loading: false,
    });

    const { result } = renderHook(() => useAttackDetailsAssignees());

    expect(result.current.hasPermission).toBe(false);
  });
});
