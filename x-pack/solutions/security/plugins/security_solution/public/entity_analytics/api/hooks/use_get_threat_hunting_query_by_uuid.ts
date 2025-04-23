/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import { useEntityAnalyticsRoutes } from '../api';

export const useGetThreatHuntingQueryByUuid = (uuid: string) => {
  const { getThreatHuntingQueryByUuid } = useEntityAnalyticsRoutes();
  return useQuery(['GET', 'THREAT_HUNTING_QUERY', uuid], () => getThreatHuntingQueryByUuid(uuid));
};
