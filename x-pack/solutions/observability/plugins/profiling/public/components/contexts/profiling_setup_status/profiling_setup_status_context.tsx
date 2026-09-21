/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AsyncStatus } from '../../../hooks/use_async';
import { useAsync } from '../../../hooks/use_async';
import type { ProfilingSetupStatus } from '../../../services';
import { useProfilingDependencies } from '../profiling_dependencies/use_profiling_dependencies';

export const ProfilingSetupStatusContext = React.createContext<
  | {
      profilingSetupStatus: ProfilingSetupStatus | undefined;
      status: AsyncStatus;
      refreshProfilingSetupStatus: () => void;
    }
  | undefined
>(undefined);

export function ProfilingSetupStatusContextProvider({
  children,
}: {
  children: React.ReactElement;
}) {
  const {
    services: { fetchHasSetup },
  } = useProfilingDependencies();

  const { data, status, refresh } = useAsync(
    ({ http }) => fetchHasSetup({ http }),
    [fetchHasSetup]
  );

  return (
    <ProfilingSetupStatusContext.Provider
      value={{ profilingSetupStatus: data, status, refreshProfilingSetupStatus: refresh }}
    >
      {children}
    </ProfilingSetupStatusContext.Provider>
  );
}
