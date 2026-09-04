/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { useQuery } from '@kbn/react-query';
import type { HttpStart } from '@kbn/core/public';
import type { ServiceDependenciesResponse } from '../../common/service_dependencies';

export const useServiceDependencies = (
  http: HttpStart,
  options?: { start?: string; end?: string }
) => {
  // Dates are captured once at mount so the query key stays stable across renders.
  const [defaultStart] = useState(() => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  const [defaultEnd] = useState(() => new Date().toISOString());

  const start = options?.start ?? defaultStart;
  const end = options?.end ?? defaultEnd;

  return useQuery<ServiceDependenciesResponse>({
    queryKey: ['service_dependencies', start, end],
    queryFn: () =>
      http.get<ServiceDependenciesResponse>('/internal/entities_caue/service_dependencies', {
        query: { start, end },
      }),
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });
};
