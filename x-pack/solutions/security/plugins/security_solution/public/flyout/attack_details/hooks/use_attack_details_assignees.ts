/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';

import type { AssigneesApplyPanelProps } from '../../../common/components/assignees/assignees_apply_panel';
import { useBulkGetUserProfiles } from '../../../common/components/user_profiles/use_bulk_get_user_profiles';
import { useLicense } from '../../../common/hooks/use_license';
import { useUpsellingMessage } from '../../../common/hooks/use_upselling';
import type { AlertAssignees } from '../../../../common/api/detection_engine';
import { useApplyAttackAssignees } from '../../../detections/hooks/attacks/bulk_actions/apply_actions/use_apply_attack_assignees';
import { useAttacksPrivileges } from '../../../detections/hooks/attacks/bulk_actions/use_attacks_privileges';
import { useInvalidateFindAttackDiscoveries } from '../../../attack_discovery/pages/use_find_attack_discoveries';
import { useAttackDetailsContext } from '../context';
import { useHeaderData } from './use_header_data';

export interface UseAttackDetailsAssigneesReturn {
  assignedUserIds: string[];
  assignedUsers: ReturnType<typeof useBulkGetUserProfiles>['data'];
  onApplyAssignees: AssigneesApplyPanelProps['onApply'];
  hasPermission: boolean;
  isPlatinumPlus: boolean;
  upsellingMessage: string | undefined;
  isLoading: boolean;
}

/**
 * Hook that encapsulates assignees state, apply (useApplyAttackAssignees), refetch,
 * cache invalidation, permissions, and user profiles for the attack details flyout header.
 */
export const useAttackDetailsAssignees = (): UseAttackDetailsAssigneesReturn => {
  const { attackId, refetch } = useAttackDetailsContext();
  const { alertIds, assignees: assignedUserIds } = useHeaderData();
  const invalidateFindAttackDiscoveries = useInvalidateFindAttackDiscoveries();
  const { applyAssignees } = useApplyAttackAssignees();
  const { hasIndexWrite, hasAttackIndexWrite, loading: privilegesLoading } = useAttacksPrivileges();
  const isPlatinumPlus = useLicense().isPlatinumPlus();
  const upsellingMessage = useUpsellingMessage('alert_assignments');

  const [isLoading, setIsLoading] = useState(false);

  const uids = useMemo(() => new Set(assignedUserIds), [assignedUserIds]);
  const { data: assignedUsers } = useBulkGetUserProfiles({ uids });

  const onAssigneesUpdated = useCallback(() => {
    refetch();
    invalidateFindAttackDiscoveries();
  }, [refetch, invalidateFindAttackDiscoveries]);

  const onApplyAssignees = useCallback<AssigneesApplyPanelProps['onApply']>(
    async (assignees: AlertAssignees) => {
      await applyAssignees({
        assignees,
        attackIds: [attackId],
        relatedAlertIds: alertIds,
        setIsLoading,
        onSuccess: onAssigneesUpdated,
      });
    },
    [alertIds, attackId, applyAssignees, onAssigneesUpdated]
  );

  const hasPermission = hasIndexWrite && hasAttackIndexWrite && !privilegesLoading;

  return useMemo(
    () => ({
      assignedUserIds,
      assignedUsers,
      onApplyAssignees,
      hasPermission,
      isPlatinumPlus,
      upsellingMessage,
      isLoading,
    }),
    [
      assignedUserIds,
      assignedUsers,
      onApplyAssignees,
      hasPermission,
      isPlatinumPlus,
      upsellingMessage,
      isLoading,
    ]
  );
};
