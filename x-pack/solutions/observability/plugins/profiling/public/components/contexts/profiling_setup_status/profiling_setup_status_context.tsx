/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { UniversalProfilingSetupStatus } from '../../../services';

export const ProfilingSetupStatusContext = React.createContext<
  | {
      profilingSetupStatus: UniversalProfilingSetupStatus | undefined;
      setProfilingSetupStatus: React.Dispatch<
        React.SetStateAction<UniversalProfilingSetupStatus | undefined>
      >;
    }
  | undefined
>(undefined);

export function ProfilingSetupStatusContextProvider({
  children,
}: {
  children: React.ReactElement;
}) {
  const [profilingSetupStatus, setProfilingSetupStatus] = useState<
    UniversalProfilingSetupStatus | undefined
  >();

  return (
    <ProfilingSetupStatusContext.Provider value={{ profilingSetupStatus, setProfilingSetupStatus }}>
      {children}
    </ProfilingSetupStatusContext.Provider>
  );
}
