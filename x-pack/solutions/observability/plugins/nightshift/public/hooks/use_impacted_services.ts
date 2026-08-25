/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import {
  getImpactedServiceStreamNames,
  resolveImpactedServices,
  type ResolvedImpactedService,
} from '../common/impacted_services';
import { useFetchStreamFeatures } from './use_fetch_stream_features';

export interface ImpactedServicesResult {
  services: ResolvedImpactedService[];
  isInitialLoading: boolean;
}

/**
 * Resolves one event's impacted services, loading the knowledge indicators referenced by its
 * topology. Impacted services are event-level: every detection of an event shares this list.
 */
export const useImpactedServices = (event: SignificantEvent): ImpactedServicesResult => {
  const streamNames = useMemo(() => getImpactedServiceStreamNames([event]), [event]);
  const { features, isInitialLoading } = useFetchStreamFeatures(streamNames);
  const services = useMemo(() => resolveImpactedServices(event, features), [event, features]);

  return { services, isInitialLoading };
};
