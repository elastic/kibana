/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '../../../../common/lib/kibana';
import { useListsPrivileges } from './use_lists_privileges';
import { useSecuritySolutionInitialization } from '../../../../common/components/initialization';
import {
  INITIALIZATION_FLOW_CREATE_LIST_INDICES,
  INITIALIZATION_FLOW_STATUS_READY,
  INITIALIZATION_FLOW_STATUS_ERROR,
} from '../../../../../common/api/initialization';

export interface UseListsConfigReturn {
  canManageIndex: boolean | null;
  canWriteIndex: boolean | null;
  enabled: boolean;
  loading: boolean;
  needsConfiguration: boolean;
  needsIndex: boolean;
}

export const useListsConfig = (): UseListsConfigReturn => {
  const initState = useSecuritySolutionInitialization([INITIALIZATION_FLOW_CREATE_LIST_INDICES]);
  const { canManageIndex, canWriteIndex, loading: privilegesLoading } = useListsPrivileges();

  const { lists } = useKibana().services;

  const listIndicesState = initState[INITIALIZATION_FLOW_CREATE_LIST_INDICES];
  const initLoading = listIndicesState.loading;
  const initReady = listIndicesState.result?.status === INITIALIZATION_FLOW_STATUS_READY;
  const initError = listIndicesState.result?.status === INITIALIZATION_FLOW_STATUS_ERROR;

  const enabled = lists != null;
  const loading = initLoading || privilegesLoading;
  const needsIndex = !initReady;
  const needsConfiguration = !enabled || (needsIndex && !initLoading && initError);

  return {
    canManageIndex,
    canWriteIndex,
    enabled,
    loading,
    needsConfiguration,
    needsIndex,
  };
};
