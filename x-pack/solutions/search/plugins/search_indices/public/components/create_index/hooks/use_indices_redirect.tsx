/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import type { IndicesStatusResponse } from '../../../../common';

import { useKibana } from '../../../hooks/use_kibana';

import { getFirstNewIndexName } from '../../../utils/indices';
import { navigateToIndexDetails } from '../../utils';
import { useUsageTracker } from '../../../contexts/usage_tracker_context';
import { AnalyticsEvents } from '../../../analytics/constants';

export const useIndicesRedirect = (indicesStatus?: IndicesStatusResponse) => {
  const { application, http } = useKibana().services;
  const [initialStatus, setInitialStatus] = useState<IndicesStatusResponse | undefined>(undefined);
  const [hasDoneRedirect, setHasDoneRedirect] = useState(() => false);
  const usageTracker = useUsageTracker();
  return useEffect(() => {
    if (hasDoneRedirect) {
      return;
    }
    if (!indicesStatus) {
      return;
    }
    if (initialStatus === undefined) {
      setInitialStatus(indicesStatus);
      return;
    }
    const newIndexName = getFirstNewIndexName(initialStatus.indexNames, indicesStatus.indexNames);
    if (newIndexName) {
      navigateToIndexDetails(application, http, newIndexName);
      setHasDoneRedirect(true);
      usageTracker.click(AnalyticsEvents.createIndexIndexCreatedRedirect);
      return;
    }
  }, [
    application,
    http,
    indicesStatus,
    initialStatus,
    setHasDoneRedirect,
    usageTracker,
    hasDoneRedirect,
  ]);
};
