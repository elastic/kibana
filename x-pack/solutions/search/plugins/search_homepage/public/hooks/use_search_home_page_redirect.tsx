/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';

import { GLOBAL_EMPTY_STATE_SKIP_KEY } from '@kbn/search-shared-ui';

import { useIndicesStatusQuery } from './api/use_indices_status_query';
import { useUserPrivilegesQuery } from './api/use_user_permissions';
import { generateRandomIndexName } from '../utils/indices';

import { useKibana } from './use_kibana';

export const useSearchHomePageRedirect = () => {
  const { application } = useKibana().services;
  const indexName = useMemo(() => generateRandomIndexName(), []);
  const { data: userPrivileges } = useUserPrivilegesQuery(indexName);
  const skipGlobalEmptyState = useMemo(() => {
    return localStorage.getItem(GLOBAL_EMPTY_STATE_SKIP_KEY) === 'true';
  }, []);
  const {
    data: indicesStatus,
    isLoading: isIndicesStatusLoading,
    error,
  } = useIndicesStatusQuery(undefined, !skipGlobalEmptyState);
  const [redirectChecked, setRedirectChecked] = useState(() => false);

  useEffect(() => {
    if (skipGlobalEmptyState) {
      setRedirectChecked(true);
      return;
    }

    if (!userPrivileges) {
      return;
    }

    if (userPrivileges?.privileges?.canManageIndex === false) {
      setRedirectChecked(true);
      return;
    }

    if (!indicesStatus || error) {
      return;
    }
    if (indicesStatus.indexNames.length === 0) {
      application.navigateToApp('elasticsearchStart').catch(() => {
        setRedirectChecked(true);
      });
      return;
    }
    setRedirectChecked(true);
  }, [application, indicesStatus, userPrivileges, skipGlobalEmptyState, error]);
  let isLoading = true;
  if (skipGlobalEmptyState) {
    isLoading = false;
  } else if (redirectChecked) {
    isLoading = isIndicesStatusLoading;
  }

  return {
    isLoading,
  };
};
