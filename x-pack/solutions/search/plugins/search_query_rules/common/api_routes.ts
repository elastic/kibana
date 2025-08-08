/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PLUGIN_ROUTE_ROOT = '/app/elasticsearch/query_rules';

export enum APIRoutes {
  QUERY_RULES_SETS = '/internal/search_query_rules/query_rules_sets',
  QUERY_RULES_QUERY_RULE_FETCH = '/internal/search_query_rules/ruleset/{ruleset_id}/rule/{rule_id}',
  QUERY_RULES_RULESET_ID = '/internal/search_query_rules/ruleset/{ruleset_id}',
  QUERY_RULES_RULESET_EXISTS = '/internal/search_query_rules/ruleset/{rulesetId}/exists',
  FETCH_INDICES = '/internal/search_query_rules/indices',
  FETCH_DOCUMENT = '/internal/search_query_rules/document/{indexName}/{documentId}',
  GENERATE_RULE_ID = '/internal/search_query_rules/ruleset/{rulesetId}/generate_rule_id',
  QUERY_RULES_RULESET_RULE = '/internal/search_query_rules/ruleset/{ruleset_id}/rule/{rule_id}',
}
