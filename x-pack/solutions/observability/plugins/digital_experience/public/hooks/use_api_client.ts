/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { createRepositoryClient } from '@kbn/server-route-repository-client';
import type {
  DefaultClientOptions,
  RouteRepositoryClient,
} from '@kbn/server-route-repository-client';
import type { DigitalExperienceServerRouteRepository } from '../../server';
import { useKibanaServices } from './use_kibana_services';

export type DigitalExperienceApiClient = RouteRepositoryClient<
  DigitalExperienceServerRouteRepository,
  DefaultClientOptions
>;

/** A typed client of the Digital Experience routes. */
export const useApiClient = (): DigitalExperienceApiClient => {
  const { http } = useKibanaServices();
  return useMemo(
    () =>
      createRepositoryClient<DigitalExperienceServerRouteRepository, DefaultClientOptions>({
        http,
      }),
    [http]
  );
};
