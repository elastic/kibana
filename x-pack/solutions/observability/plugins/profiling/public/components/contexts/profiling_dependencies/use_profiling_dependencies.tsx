/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import { ProfilingDependenciesContext } from './profiling_dependencies_context';

export function useProfilingDependencies() {
  const context = useContext(ProfilingDependenciesContext);
  if (!context) {
    throw new Error('ProfilingDependenciesContext not found');
  }
  return context;
}
