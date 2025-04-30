/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PLUGIN_ROUTE_ROOT = '/app/elasticsearch/query_rules';

export enum APIRoutes {
  QUERY_RULES_SETS = '/internal/search_query_rules/query_rules_sets',
  QUERY_RULES_RULESET_FETCH = '/internal/search_query_rules/ruleset/{ruleset_id}',
}
