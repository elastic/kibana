/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQueryClient, useIsFetching } from '@kbn/react-query';

export const useRefresh = (refreshQueryKey: string) => {
  const queryClient = useQueryClient();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: [refreshQueryKey] });
  };

  const isRefreshing = useIsFetching({ queryKey: [refreshQueryKey] }) > 0;

  return { refresh, isRefreshing };
};
