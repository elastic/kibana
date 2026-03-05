/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '../../../../common/lib/kibana';
import { useListsPrivileges } from './use_lists_privileges';
import { useSecuritySolutionInitialization } from '../../../../common/components/initialization';

export interface UseListsConfigReturn {
  canManageIndex: boolean | null;
  canWriteIndex: boolean | null;
  enabled: boolean;
  loading: boolean;
  needsConfiguration: boolean;
  needsIndex: boolean;
}

export const useListsConfig = (): UseListsConfigReturn => {
  const initState = useSecuritySolutionInitialization(['create-list-indices']);
  const { canManageIndex, canWriteIndex, loading: privilegesLoading } = useListsPrivileges();

  const { lists } = useKibana().services;

  const listIndicesState = initState['create-list-indices'];
  const initLoading = listIndicesState?.loading ?? true;
  const initReady = listIndicesState?.result?.status === 'ready';
  const initError = listIndicesState?.error ?? listIndicesState?.result?.error ?? null;

  const enabled = lists != null;
  const loading = initLoading || privilegesLoading;
  const needsIndex = !initReady;
  const needsConfiguration = !enabled || (needsIndex && !initLoading && initError != null);

  return {
    canManageIndex,
    canWriteIndex,
    enabled,
    loading,
    needsConfiguration,
    needsIndex,
  };
};
