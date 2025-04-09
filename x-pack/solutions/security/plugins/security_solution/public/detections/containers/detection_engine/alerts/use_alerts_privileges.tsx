/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useUserPrivileges } from '../../../../common/components/user_privileges';

export interface UseAlertsPrivelegesReturn extends AlertsPrivelegesState {
  loading: boolean;
}

export interface AlertsPrivelegesState {
  isAuthenticated: boolean | null;
  hasEncryptionKey: boolean | null;
  hasIndexManage: boolean | null;
  hasIndexWrite: boolean | null;
  hasIndexUpdateDelete: boolean | null;
  hasIndexMaintenance: boolean | null;
  hasIndexRead: boolean | null;
  hasKibanaCRUD: boolean;
  hasKibanaREAD: boolean;
}
/**
 * Hook to get user privilege from
 *
 */
export const useAlertsPrivileges = (): UseAlertsPrivelegesReturn => {
  const {
    detectionEnginePrivileges: { error, result, loading },
    kibanaSecuritySolutionsPrivileges: { crud: hasKibanaCRUD, read: hasKibanaREAD },
  } = useUserPrivileges();

  const indexName = useMemo(() => {
    if (result?.index && Object.keys(result.index).length > 0) {
      return Object.keys(result.index)[0];
    }
    return null;
  }, [result?.index]);

  const privileges = useMemo(() => {
    if (error != null) {
      return {
        isAuthenticated: false,
        hasEncryptionKey: false,
        hasIndexManage: false,
        hasIndexRead: false,
        hasIndexWrite: false,
        hasIndexUpdateDelete: false,
        hasIndexMaintenance: false,
        hasKibanaCRUD,
        hasKibanaREAD,
      };
    }

    if (result != null && indexName) {
      return {
        isAuthenticated: result.is_authenticated,
        hasEncryptionKey: result.has_encryption_key,
        hasIndexManage: result.index[indexName].manage && result.cluster.manage,
        hasIndexMaintenance: result.index[indexName].maintenance,
        hasIndexRead: result.index[indexName].read,
        hasIndexWrite:
          result.index[indexName].create ||
          result.index[indexName].create_doc ||
          result.index[indexName].index ||
          result.index[indexName].write,
        hasIndexUpdateDelete: result.index[indexName].write,
        hasKibanaCRUD,
        hasKibanaREAD,
      };
    }

    return {
      isAuthenticated: null,
      hasEncryptionKey: null,
      hasIndexManage: null,
      hasIndexRead: null,
      hasIndexWrite: null,
      hasIndexUpdateDelete: null,
      hasIndexMaintenance: null,
      hasKibanaCRUD: false,
      hasKibanaREAD: false,
    };
  }, [error, result, indexName, hasKibanaCRUD, hasKibanaREAD]);

  return { loading: loading ?? false, ...privileges };
};
