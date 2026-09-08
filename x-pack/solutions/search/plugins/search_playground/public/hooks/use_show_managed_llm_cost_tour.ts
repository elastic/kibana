/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { ELASTIC_LLM_COST_TOUR_SKIP_KEY } from '@kbn/search-shared-ui';
import { useKibana } from './use_kibana';
import { useUsageTracker } from './use_usage_tracker';
import { AnalyticsEvents } from '../analytics/constants';

export const useShowManagedLLMCostTour = () => {
  const usageTracker = useUsageTracker();
  const { cloud, notifications } = useKibana().services;
  const [isTourVisible, setIsTourVisible] = useState<boolean>(false);
  const onSkipTour = useCallback(() => {
    localStorage.setItem(ELASTIC_LLM_COST_TOUR_SKIP_KEY, 'true');
    setIsTourVisible(false);
    usageTracker?.click(AnalyticsEvents.closedCostTransparencyTour);
  }, [usageTracker]);
  const isTourEnabled = notifications.tours.isEnabled();

  useEffect(() => {
    const isTourSkipped = localStorage.getItem(ELASTIC_LLM_COST_TOUR_SKIP_KEY) === 'true';
    const isCloud = cloud?.isServerlessEnabled ?? false;

    if (!isTourSkipped && isCloud && !isTourVisible && isTourEnabled) {
      setIsTourVisible(true);
      usageTracker?.click(AnalyticsEvents.viewCostTransparencyTour);
    }
  }, [cloud, isTourVisible, usageTracker, isTourEnabled]);

  return { isTourVisible, onSkipTour };
};
