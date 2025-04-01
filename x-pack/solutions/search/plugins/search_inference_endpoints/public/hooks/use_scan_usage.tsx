/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useKibana } from './use_kibana';
import { InferenceUsageResponse } from '../types';

interface ScanUsageProps {
  type: string;
  id: string;
}

export const useScanUsage = ({ type, id }: ScanUsageProps) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: ['inference-endpoint-scan-usage'],
    queryFn: () =>
      services.http.delete<InferenceUsageResponse>(
        `/internal/inference_endpoint/endpoints/${type}/${id}`,
        {
          query: {
            scanUsage: true,
          },
        }
      ),
  });
};
