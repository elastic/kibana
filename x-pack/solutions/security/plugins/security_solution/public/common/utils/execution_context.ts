/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';

const EXECUTION_CONTEXT_TYPE = 'security_solution';

/** Builds a child execution context for a Security Solution request while retaining app context. */
export const buildExecutionContext = (
  name: string,
  id: string
): { child: KibanaExecutionContext } => ({
  child: {
    type: EXECUTION_CONTEXT_TYPE,
    name,
    id,
  },
});
