/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SentinelOneGetAgentsResponse } from '@kbn/stack-connectors-plugin/common/sentinelone/types';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type { ResponseActionAgentType } from '../../../../common/endpoint/service/response_actions/constants';
import { CUSTOM_SCRIPTS_ROUTE } from '../../../../common/endpoint/constants';
import { useHttp } from '../../../common/lib/kibana';

interface ErrorType {
  statusCode: number;
  message: string;
  meta: ActionTypeExecutorResult<SentinelOneGetAgentsResponse>;
}

/**
 * Retrieve the status of a supported host's agent type
 * @param agentType
 * @param options
 */
export const useGetCustomScripts = (
  agentType: ResponseActionAgentType,
  options: any = {}
): UseQueryResult<any, IHttpFetchError<ErrorType>> => {
  const http = useHttp();

  return useQuery<any, IHttpFetchError<ErrorType>>({
    queryKey: ['get-agent-status', agentType],
    // refetchInterval: DEFAULT_POLL_INTERVAL,
    ...options,
    queryFn: () => {
      return http
        .get<any>(CUSTOM_SCRIPTS_ROUTE, {
          version: '1',
          query: {
            agentType,
          },
        })
        .then((response) => response.data);
    },
  });
};
