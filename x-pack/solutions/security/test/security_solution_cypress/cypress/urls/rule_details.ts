/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type RuleDetailsTabs =
  | 'alerts'
  | 'rule_exceptions'
  | 'endpoint_exceptions'
  | 'execution_results'
  | 'execution_events';

export function ruleDetailsUrl(ruleId: string, tab?: RuleDetailsTabs): string {
  return `/app/security/rules/id/${ruleId}${tab ? `/${tab}` : ''}`;
}
