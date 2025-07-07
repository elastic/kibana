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
  const { application, http } = useKibana().services;
  const indexName = useMemo(() => generateRandomIndexName(), []);
  const { data: userPrivileges } = useUserPrivilegesQuery(indexName);
  const skipGlobalEmptyState = useMemo(() => {
    return localStorage.getItem(GLOBAL_EMPTY_STATE_SKIP_KEY) === 'true';
  }, []);
  const { data: indicesStatus } = useIndicesStatusQuery(undefined, !skipGlobalEmptyState);

  const [hasDoneRedirect, setHasDoneRedirect] = useState(() => false);
  return useEffect(() => {
    if (hasDoneRedirect || skipGlobalEmptyState) {
      return;
    }

    if (!userPrivileges) {
      return;
    }

    if (userPrivileges?.privileges?.canManageIndex === false) {
      setHasDoneRedirect(true);
      return;
    }

    if (!indicesStatus) {
      return;
    }
    if (indicesStatus.indexNames.length === 0) {
      application.navigateToApp('elasticsearchStart');
      setHasDoneRedirect(true);
      return;
    }

    setHasDoneRedirect(true);
  }, [
    application,
    http,
    indicesStatus,
    setHasDoneRedirect,
    hasDoneRedirect,
    userPrivileges,
    skipGlobalEmptyState,
  ]);
};
