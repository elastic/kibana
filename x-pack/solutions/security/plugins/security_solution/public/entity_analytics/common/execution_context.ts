/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';

const EXECUTION_CONTEXT_TYPE = 'security_solution';

/**
 * Builds the `child` slice of a Kibana execution context for a query issued
 * from a Security Solution / Entity Analytics UI surface. The parent app
 * context (`type: 'application'`, `name: <appId>`, `page: <pathname>`) is
 * merged in automatically by core when the search or http.fetch call
 * executes, so callers only supply the child descriptor.
 *
 * @param name Logical page or feature the query belongs to (e.g. `entity_analytics-home_page`).
 * @param id   Panel or query token within the page (e.g. `entities_table`).
 */
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
