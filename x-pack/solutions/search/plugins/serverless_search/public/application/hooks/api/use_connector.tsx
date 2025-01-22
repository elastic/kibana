/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Connector } from '@kbn/search-connectors';
import { useQuery } from '@tanstack/react-query';
import { useKibanaServices } from '../use_kibana';

export const useConnector = (id: string) => {
  const { http } = useKibanaServices();
  const queryKey = ['fetchConnector', id];
  const result = useQuery({
    queryKey,
    queryFn: () =>
      http.fetch<{ connector: Connector }>(`/internal/serverless_search/connector/${id}`),
  });
  return { queryKey, ...result };
};
