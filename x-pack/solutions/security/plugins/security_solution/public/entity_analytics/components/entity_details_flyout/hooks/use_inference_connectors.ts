/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import type { InferenceConnector } from '@kbn/inference-common';
import type { HttpSetup } from '@kbn/core-http-browser';

export interface UseInferenceConnectorsResult {
  connectors: InferenceConnector[];
  hasConnectors: boolean;
}

export interface Props {
  http: HttpSetup;
}

const QUERY_KEY = ['entity-analytics', 'load-inference-connectors'];

export function useLoadInferenceConnectors({
  http,
}: Props): UseQueryResult<UseInferenceConnectorsResult> {
  return useQuery(QUERY_KEY, async ({ signal }) => {
    const response = await http.get<{ connectors: InferenceConnector[] }>(
      `/internal/inference/connectors`,
      { signal }
    );
    return {
      connectors: response.connectors,
      hasConnectors: response.connectors.length > 0,
    };
  });
}
