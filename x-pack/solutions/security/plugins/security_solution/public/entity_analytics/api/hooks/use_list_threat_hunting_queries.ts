/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import type { ThreatHuntingListRequestQuery } from '../../../../common/api/entity_analytics/threat_hunting/list.gen';
import { useEntityAnalyticsRoutes } from '../api';

export const useListThreatHuntingQueries = (params: ThreatHuntingListRequestQuery) => {
  const { listThreatHuntingQueries } = useEntityAnalyticsRoutes();
  return useQuery(['GET', 'LIST_THREAT_HUNTING_QUERIES', params], () =>
    listThreatHuntingQueries(params)
  );
};
