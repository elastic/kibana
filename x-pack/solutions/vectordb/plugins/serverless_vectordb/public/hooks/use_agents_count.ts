/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { AGENTS_COUNT_PATH } from '../../common/constants';
import { useKibana } from './use_kibana';

const initialAgentsCount = null;

export const useAgentsCount = () => {
  const {
    services: { http },
  } = useKibana();

  const { data, isLoading } = useQuery({
    queryKey: ['agentsCount'],
    queryFn: async () => {
      const response = await http.get<{ count?: number }>(AGENTS_COUNT_PATH).catch(() => null);
      return response?.count ?? null;
    },
    refetchOnWindowFocus: false,
  });

  return { agentsCount: data ?? initialAgentsCount, isLoading };
};
