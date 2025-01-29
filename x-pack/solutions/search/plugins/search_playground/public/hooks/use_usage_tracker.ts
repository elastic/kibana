/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { METRIC_TYPE } from '@kbn/analytics';
import { useMemo } from 'react';
import { useKibana } from './use_kibana';

const APP_TRACKER_NAME = 'search_playground';

export const useUsageTracker = () => {
  const { usageCollection } = useKibana().services;

  return useMemo(() => {
    if (usageCollection) {
      return {
        click: usageCollection.reportUiCounter.bind(
          usageCollection,
          APP_TRACKER_NAME,
          METRIC_TYPE.CLICK
        ),
        count: usageCollection.reportUiCounter.bind(
          usageCollection,
          APP_TRACKER_NAME,
          METRIC_TYPE.COUNT
        ),
        load: usageCollection.reportUiCounter.bind(
          usageCollection,
          APP_TRACKER_NAME,
          METRIC_TYPE.LOADED
        ),
      };
    }
  }, [usageCollection]);
};
