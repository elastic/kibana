/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useEntityAnalyticsRoutes } from '../api';

const BEHAVIORAL_SUMMARY_QUERY_KEY = 'behavioral_summary';

export const useBehavioralSummary = (entityId?: string) => {
  const { fetchBehavioralSummary } = useEntityAnalyticsRoutes();

  return useQuery(
    [BEHAVIORAL_SUMMARY_QUERY_KEY, entityId],
    ({ signal }) => fetchBehavioralSummary(entityId ?? '', signal),
    { enabled: !!entityId }
  );
};
