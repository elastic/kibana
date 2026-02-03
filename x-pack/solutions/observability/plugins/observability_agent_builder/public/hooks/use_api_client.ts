/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import {
  createRepositoryClient,
  type DefaultClientOptions,
} from '@kbn/server-route-repository-client';
import type { RouteRepositoryClient } from '@kbn/server-route-repository-utils';
import type { ObservabilityAgentBuilderServerRouteRepository } from '../../server';
import { useKibana } from './use_kibana';

export function useApiClient(): RouteRepositoryClient<
  ObservabilityAgentBuilderServerRouteRepository,
  DefaultClientOptions
> {
  const {
    services: { http },
  } = useKibana();

  return useMemo(
    () =>
      createRepositoryClient<ObservabilityAgentBuilderServerRouteRepository, DefaultClientOptions>({
        http,
      }),
    [http]
  );
}
