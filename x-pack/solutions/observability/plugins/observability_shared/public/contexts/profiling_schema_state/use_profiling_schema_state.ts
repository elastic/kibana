/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import type { ProfilingSchemaStateContextValue } from './profiling_schema_state_context';
import { ProfilingSchemaStateContext } from './profiling_schema_state_context';

/** Returns the profiling schema selected for the profiling embeddables and a setter for it. */
export const useProfilingSchemaState = (): ProfilingSchemaStateContextValue => {
  const context = useContext(ProfilingSchemaStateContext);

  if (!context) {
    throw new Error('useProfilingSchemaState must be used within a ProfilingSchemaStateProvider');
  }

  return context;
};
