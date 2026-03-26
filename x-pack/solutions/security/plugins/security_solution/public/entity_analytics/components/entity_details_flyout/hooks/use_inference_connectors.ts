/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import type { InferenceConnector } from '@kbn/inference-common';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';

export interface UseInferenceConnectorsResult {
  connectors: InferenceConnector[];
  hasConnectors: boolean;
}

const QUERY_KEY = ['entity-analytics', 'load-inference-connectors'];

export function useLoadInferenceConnectors(): UseQueryResult<UseInferenceConnectorsResult> {
  const { inference } = useKibana().services;
  return useQuery(QUERY_KEY, async () => {
    const connectors = await inference.getConnectors();
    return {
      connectors,
      hasConnectors: connectors.length > 0,
    };
  });
}
