/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { checkArtifactHasData } from '../../services/exceptions_list/check_artifact_has_data';
import type { ExceptionsListApiClient } from '../../services/exceptions_list/exceptions_list_api_client';

export const useHostIsolationExceptionsAccess = (
  canAccessHostIsolationExceptions: boolean,
  canReadHostIsolationExceptions: boolean,
  getApiClient: () => ExceptionsListApiClient
): {
  hasAccessToHostIsolationExceptions: boolean;
  isHostIsolationExceptionsAccessLoading: boolean;
} => {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      // Host isolation exceptions is a paid feature and therefore:
      // canAccessHostIsolationExceptions signifies if the user has required license to access the feature.
      // canReadHostIsolationExceptions, however, is a privilege that allows the user to read and delete the data even if the license is not sufficient (downgrade scenario).
      // In such cases, the tab should be visible only if there is existing data.
      if (canAccessHostIsolationExceptions) {
        setHasAccess(true);
      } else if (canReadHostIsolationExceptions) {
        const result = await checkArtifactHasData(getApiClient());
        setHasAccess(result);
      } else {
        setHasAccess(false);
      }
    })();
  }, [canAccessHostIsolationExceptions, canReadHostIsolationExceptions, getApiClient]);

  return {
    hasAccessToHostIsolationExceptions: !!hasAccess,
    isHostIsolationExceptionsAccessLoading: hasAccess === null,
  };
};
