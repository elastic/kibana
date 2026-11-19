/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { createContext, useMemo, useState } from 'react';
import type { ProfilingSchema } from '@kbn/profiling-utils';

export interface ProfilingSchemaStateContextValue {
  schema?: ProfilingSchema;
  setSchema: (schema: ProfilingSchema) => void;
}

export const ProfilingSchemaStateContext = createContext<
  ProfilingSchemaStateContextValue | undefined
>(undefined);

/** Shares the profiling schema selected for the profiling embeddables among its children. */
export const ProfilingSchemaStateProvider = ({ children }: { children: ReactNode }) => {
  const [schema, setSchema] = useState<ProfilingSchema>();

  const value = useMemo(() => ({ schema, setSchema }), [schema]);

  return (
    <ProfilingSchemaStateContext.Provider value={value}>
      {children}
    </ProfilingSchemaStateContext.Provider>
  );
};
