/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SentinelOneGetAgentsResponse } from '@kbn/stack-connectors-plugin/common/sentinelone/types';
import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type { ResponseActionAgentType } from '../../../../common/endpoint/service/response_actions/constants';
import { DEFAULT_POLL_INTERVAL } from '../../common/constants';
import { AGENT_STATUS_ROUTE } from '../../../../common/endpoint/constants';
import type { AgentStatusRecords, AgentStatusApiResponse } from '../../../../common/endpoint/types';
import { useHttp } from '../../../common/lib/kibana';

interface ErrorType {
  statusCode: number;
  message: string;
  meta: ActionTypeExecutorResult<SentinelOneGetAgentsResponse>;
}

/**
 * Retrieve the status of a supported host's agent type
 * @param agentIds
 * @param agentType
 * @param options
 */
export const useGetAgentStatus = (
  agentIds: string[] | string,
  agentType: ResponseActionAgentType,
  options: Omit<UseQueryOptions<AgentStatusRecords, IHttpFetchError<ErrorType>>, 'queryFn'> = {}
): UseQueryResult<AgentStatusRecords, IHttpFetchError<ErrorType>> => {
  const http = useHttp();
  const agentIdList = (Array.isArray(agentIds) ? agentIds : [agentIds]).filter(
    (agentId) => agentId.trim().length
  );

  return useQuery<AgentStatusRecords, IHttpFetchError<ErrorType>>({
    queryKey: ['get-agent-status', agentIdList],
    refetchInterval: DEFAULT_POLL_INTERVAL,
    ...options,
    queryFn: () => {
      if (agentIdList.length === 0) {
        return {};
      }

      return http
        .get<AgentStatusApiResponse>(AGENT_STATUS_ROUTE, {
          version: '1',
          query: {
            agentIds: agentIdList,
            agentType,
          },
        })
        .then((response) => response.data);
    },
  });
};
