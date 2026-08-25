/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useAlertsPrivileges } from '../../../containers/detection_engine/alerts/use_alerts_privileges';
import { useGetMissingIndexPrivileges } from '../../../../attack_discovery/pages/use_get_missing_index_privileges';

/**
 * Combined privilege state for both alerts and attacks indices
 */
export interface AttacksPrivileges {
  /** Whether user has write access to alerts indices */
  hasIndexWrite: boolean;
  /** Whether user has write access to attacks indices */
  hasAttackIndexWrite: boolean;
  /** Whether privilege checks are still loading */
  loading: boolean;
}

/**
 * Hook that combines privilege checks for both alerts and attacks indices.
 * Returns write access status for both index types, which must both be true for bulk actions to be enabled.
 *
 * @returns Combined privilege state with alerts and attacks write access
 */
export const useAttacksPrivileges = (): AttacksPrivileges => {
  const { hasIndexWrite, loading: detectionLoading } = useAlertsPrivileges();
  const { data: missingIndexPrivileges = [], isLoading: attackLoading } =
    useGetMissingIndexPrivileges();

  return useMemo(() => {
    // If missingIndexPrivileges array is empty, user has write access to attacks indices
    const hasAttackIndexWrite = missingIndexPrivileges.length === 0;

    return {
      hasIndexWrite: hasIndexWrite ?? false,
      hasAttackIndexWrite,
      loading: detectionLoading || attackLoading,
    };
  }, [hasIndexWrite, missingIndexPrivileges.length, detectionLoading, attackLoading]);
};
