/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PROJECT_ROUTING_ALL } from '@kbn/cps-server-utils';

/**
 * Prefixes an ES|QL query with `SET project_routing` across every CPS-linked project.
 *
 * Alerting v2 still injects space routing on the request body, and Elasticsearch prefers
 * the in-query SET (`default < body < SET`). Serverless-only preview syntax; applied on
 * every serverless rule so it is CPS-ready without a later sync. `_alias:*` is a no-op
 * on a single project.
 */
export const withAllProjectsRouting = (query: string): string =>
  `SET project_routing="${PROJECT_ROUTING_ALL}";\n${query}`;
