/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ProfilingStatus } from '@kbn/profiling-utils';
import type { AsyncState } from '../../../hooks/use_async';
import { useAsync } from '../../../hooks/use_async';
import { useProfilingDependencies } from '../profiling_dependencies/use_profiling_dependencies';

export const ProfilingStatusContext = React.createContext<AsyncState<ProfilingStatus> | undefined>(
  undefined
);

export function ProfilingStatusContextProvider({ children }: { children: React.ReactElement }) {
  const {
    services: { fetchProfilingStatus },
  } = useProfilingDependencies();

  const profilingStatus = useAsync(
    ({ http }) => fetchProfilingStatus({ http }),
    [fetchProfilingStatus]
  );

  return (
    <ProfilingStatusContext.Provider value={profilingStatus}>
      {children}
    </ProfilingStatusContext.Provider>
  );
}
