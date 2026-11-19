/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import { ProfilingSchemaContext } from './profiling_schema_context';

export function useProfilingSchema() {
  const context = useContext(ProfilingSchemaContext);
  if (!context) {
    throw new Error('ProfilingSchemaContext not found');
  }
  return context;
}
