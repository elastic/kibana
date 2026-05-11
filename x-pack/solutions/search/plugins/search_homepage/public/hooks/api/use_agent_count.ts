/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';

import { useKibana } from '../use_kibana';
import { useGetLicenseInfo } from '../use_get_license_info';
import { getErrorCode } from '../../utils/get_error_message';

export const useAgentCount = () => {
  const {
    services: { agentBuilder },
  } = useKibana();

  const { hasEnterpriseLicense } = useGetLicenseInfo();

  const isAvailable = hasEnterpriseLicense && !!agentBuilder;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['fetchAgentCount'],
    retry: false,
    queryFn: async () => {
      try {
        const [agents, tools] = await Promise.all([
          agentBuilder?.agents.list(),
          agentBuilder?.tools.list(),
        ]);
        return {
          agents: agents?.length,
          tools: tools?.length,
        };
      } catch (error) {
        if (getErrorCode(error) === 403) {
          return null;
        }
        throw error;
      }
    },
    enabled: isAvailable,
  });

  return {
    tools: data?.tools,
    agents: data?.agents,
    isLoading,
    isError,
  };
};
