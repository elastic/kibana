/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { NO_PRIVILEGE_FOR_MANAGEMENT_OF_GLOBAL_ARTIFACT_MESSAGE } from '../../common/translations';
import { MANAGEMENT_OF_SHARED_PER_POLICY_ARTIFACT_NOT_ALLOWED_MESSAGE } from '../../components/artifact_entry_card/components/translations';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { isArtifactGlobal } from '../../../../common/endpoint/service/artifacts';
import { getArtifactOwnerSpaceIds } from '../../../../common/endpoint/service/artifacts/utils';

export interface ArtifactActionsDisabledState {
  isDisabled: boolean;
  disabledTooltip: ReactNode;
}

/**
 * Whether artifact row/card actions should be disabled for the current user and space.
 */
export const useArtifactActionsDisabled = (
  item: Partial<Pick<ExceptionListItemSchema, 'tags'>>
): ArtifactActionsDisabledState => {
  const canManageGlobalArtifacts = useUserPrivileges().endpointPrivileges.canManageGlobalArtifacts;
  const isGlobal = useMemo(() => isArtifactGlobal(item), [item]);
  const ownerSpaceIds = useMemo(() => getArtifactOwnerSpaceIds(item), [item]);
  const activeSpaceId = useSpaceId();

  return useMemo<ArtifactActionsDisabledState>(() => {
    if (canManageGlobalArtifacts) {
      return { isDisabled: false, disabledTooltip: undefined };
    }

    if (isGlobal) {
      return {
        isDisabled: true,
        disabledTooltip: NO_PRIVILEGE_FOR_MANAGEMENT_OF_GLOBAL_ARTIFACT_MESSAGE,
      };
    }

    if (!activeSpaceId || !ownerSpaceIds.includes(activeSpaceId)) {
      return {
        isDisabled: true,
        disabledTooltip: MANAGEMENT_OF_SHARED_PER_POLICY_ARTIFACT_NOT_ALLOWED_MESSAGE,
      };
    }

    return { isDisabled: false, disabledTooltip: undefined };
  }, [activeSpaceId, canManageGlobalArtifacts, isGlobal, ownerSpaceIds]);
};
