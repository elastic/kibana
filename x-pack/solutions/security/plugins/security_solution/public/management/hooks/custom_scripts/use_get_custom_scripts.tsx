/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseQueryResult, UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import React, { useRef } from 'react';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { EuiText } from '@elastic/eui';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CustomScript, CustomScriptsResponse } from '../../../../server/endpoint/services';
import type { ResponseActionAgentType } from '../../../../common/endpoint/service/response_actions/constants';
import { CUSTOM_SCRIPTS_ROUTE } from '../../../../common/endpoint/constants';
import { useHttp, useKibana } from '../../../common/lib/kibana';

/**
 * Error type for custom scripts API errors
 */
interface CustomScriptsErrorType {
  statusCode: number;
  message: string;
  meta: ActionTypeExecutorResult<unknown>;
}

/**
 * Hook to retrieve custom scripts for a specific agent type
 * @param agentType - The type of agent to get scripts for (e.g., 'crowdstrike')
 * @param options - Additional options for the query
 * @returns Query result containing custom scripts data
 */

export const useGetCustomScripts = (
  agentType: ResponseActionAgentType,
  options: Omit<
    UseQueryOptions<CustomScriptsResponse, IHttpFetchError<CustomScriptsErrorType>>,
    'queryKey' | 'queryFn'
  > = {}
): UseQueryResult<CustomScript[], IHttpFetchError<CustomScriptsErrorType>> => {
  const http = useHttp();
  const { notifications } = useKibana();
  const toastShownRef = useRef(false);

  return useQuery<CustomScript[], IHttpFetchError<CustomScriptsErrorType>>({
    queryKey: ['get-custom-scripts', agentType],
    queryFn: () => {
      return http
        .get<CustomScriptsResponse>(CUSTOM_SCRIPTS_ROUTE, {
          version: '1',
          query: {
            agentType,
          },
        })
        .then((response) => response.data)
        .catch((err) => {
          const { error } = getMessageFieldFromStringifiedObject(err?.body.message) || {};
          if (error && !toastShownRef.current) {
            notifications.toasts.danger({
              title: error.code,
              body: (
                <EuiText size="s">
                  <p>
                    <FormattedMessage
                      id="xpack.securitySolution.endpoint.customScripts.fetchError"
                      defaultMessage="Failed to fetch Microsoft Defender for Endpoint scripts"
                    />
                  </p>
                  <p>{error?.message || err.body.message}</p>
                </EuiText>
              ),
            });
            toastShownRef.current = true;
          }
          throw error;
        });
    },
  });
};

export function getMessageFieldFromStringifiedObject(
  str: string
): { error: { code: string; message: string } } | undefined {
  const marker = 'Response body: ';
  const idx = str.indexOf(marker);
  if (idx === -1) return undefined;

  const jsonPart = str.slice(idx + marker.length).trim();
  try {
    return JSON.parse(jsonPart);
  } catch {
    return undefined;
  }
}
