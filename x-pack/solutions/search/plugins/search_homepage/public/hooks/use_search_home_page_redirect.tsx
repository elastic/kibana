/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import type { IndicesStatusResponse } from '../../common/types';

import { useKibana } from './use_kibana';
import type { UserStartPrivilegesResponse } from '../../common/types';

export const useSearchHomePageRedirect = (
  indicesStatus?: IndicesStatusResponse,
  userPrivileges?: UserStartPrivilegesResponse
) => {
  const { application, http } = useKibana().services;
  const [lastStatus, setLastStatus] = useState<IndicesStatusResponse | undefined>(() => undefined);
  const [hasDoneRedirect, setHasDoneRedirect] = useState(() => false);
  return useEffect(() => {
    if (hasDoneRedirect) {
      return;
    }

    if (!userPrivileges) {
      return;
    }

    if (userPrivileges?.privileges?.canManageIndex === false) {
      application.navigateToApp('discover');
      setHasDoneRedirect(true);
      return;
    }

    if (!indicesStatus) {
      return;
    }
    if (indicesStatus.indexNames.length === 0) {
      setLastStatus(indicesStatus);
      return;
    }
    if (lastStatus === undefined && indicesStatus.indexNames.length > 0) {
      application.navigateToApp('elasticsearchIndexManagement');
      setHasDoneRedirect(true);
      return;
    }

    application.navigateToApp('elasticsearchIndexManagement');
    setHasDoneRedirect(true);
  }, [
    application,
    http,
    indicesStatus,
    lastStatus,
    setHasDoneRedirect,
    hasDoneRedirect,
    userPrivileges,
  ]);
};
