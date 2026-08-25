/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';

import { useQuery } from '@kbn/react-query';

import { useKibana } from '../use_kibana';
import { useGetLicenseInfo } from '../use_get_license_info';
import { getErrorCode } from '../../utils/get_error_message';
import { useUsageTracker } from '../../contexts/usage_tracker_context';
import { AnalyticsEvents } from '../../analytics/constants';

export const useAgentCount = () => {
  const {
    services: { agentBuilder },
  } = useKibana();
  const usageTracker = useUsageTracker();

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
          agents: agents?.length ?? 0,
          tools: tools?.length ?? 0,
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

  useEffect(() => {
    if (isError) {
      usageTracker.count([
        AnalyticsEvents.metricFetchFailed,
        `${AnalyticsEvents.metricFetchFailed}_agents`,
      ]);
    }
  }, [isError, usageTracker]);

  return {
    tools: data?.tools,
    agents: data?.agents,
    isLoading,
    isError,
  };
};
