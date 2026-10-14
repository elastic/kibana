/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { GETTING_STARTED_SESSIONSTORAGE_KEY } from '@kbn/search-shared-ui';
import { AnalyticsEvents } from '../../common';
import { useUsageTracker } from '../contexts/usage_tracker_context';

export const useGettingStartedLoaded = (event: string = AnalyticsEvents.gettingStartedLoaded) => {
  const usageTracker = useUsageTracker();
  useEffect(() => {
    usageTracker.load(event);
    sessionStorage.setItem(GETTING_STARTED_SESSIONSTORAGE_KEY, 'true');
  }, [usageTracker, event]);
};
