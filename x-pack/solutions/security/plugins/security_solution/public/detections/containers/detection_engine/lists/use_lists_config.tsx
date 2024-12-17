/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';

import { useKibana } from '../../../../common/lib/kibana';
import { useListsIndex } from './use_lists_index';
import { useListsPrivileges } from './use_lists_privileges';
import { useUserPrivileges } from '../../../../common/components/user_privileges';

export interface UseListsConfigReturn {
  canManageIndex: boolean | null;
  canWriteIndex: boolean | null;
  enabled: boolean;
  loading: boolean;
  needsConfiguration: boolean;
  needsIndex: boolean;
  canCreateIndex: boolean | null;
}

export const useListsConfig = (): UseListsConfigReturn => {
  const { createIndex, indexExists, loading: indexLoading, error: indexError } = useListsIndex();
  const { canManageIndex, canWriteIndex, loading: privilegesLoading } = useListsPrivileges();
  const { detectionEnginePrivileges } = useUserPrivileges();

  const { lists } = useKibana().services;

  const canManageCluster = detectionEnginePrivileges.result?.cluster.manage ?? null;
  const enabled = lists != null;
  const loading = indexLoading || privilegesLoading;
  const needsIndex = indexExists === false;
  const hasIndexError = indexError != null;
  const needsIndexConfiguration =
    needsIndex && (canManageIndex === false || (canManageIndex === true && hasIndexError));
  const needsConfiguration = !enabled || needsIndexConfiguration;
  // Index can be created only when manage cluster privilege assigned to user role.
  // It's needed to create index templates
  const canCreateIndex = canManageIndex && canManageCluster;

  useEffect(() => {
    if (needsIndex && canCreateIndex && !indexLoading) {
      createIndex();
    }
  }, [createIndex, needsIndex, canCreateIndex, indexLoading]);

  return {
    canManageIndex,
    canWriteIndex,
    enabled,
    loading,
    needsConfiguration,
    needsIndex,
    canCreateIndex,
  };
};
