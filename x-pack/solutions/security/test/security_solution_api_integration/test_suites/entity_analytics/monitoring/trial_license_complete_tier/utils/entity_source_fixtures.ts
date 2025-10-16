/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface Matcher {
  fields: string[];
  values: string[];
}
interface EntitySourceIndex {
  type: 'index';
  name: string;
  managed: boolean;
  indexPattern: string;
  enabled: boolean;
  matchers: Matcher[];
  filter: Record<string, unknown>;
}

interface EntitySourceIntegration {
  type: 'entity_analytics_integration';
  managed: boolean;
  indexPattern: string;
  name: string;
  matchers: Matcher[];
  id: string;
}

export function createIndexEntitySource(
  indexPattern: string,
  overrides: Partial<EntitySourceIndex> = {}
): EntitySourceIndex {
  return {
    type: 'index',
    name: 'PrivilegedUsers',
    managed: true,
    indexPattern,
    enabled: true,
    matchers: [{ fields: ['user.role'], values: ['admin'] }],
    filter: {},
    ...overrides,
  };
}

export function createIntegrationEntitySource(
  overrides: Partial<EntitySourceIntegration> = {}
): EntitySourceIntegration {
  return {
    type: 'entity_analytics_integration',
    managed: true,
    indexPattern: 'logs-entityanalytics_test.user-default',
    name: '.entity_analytics.monitoring.sources.test-default',
    matchers: [
      { fields: ['user.roles'], values: ['Group Administrator', 'Read-only Administrator'] },
    ],
    id: 'AZlHQD20hY07UD0HNBs9',
    ...overrides,
  };
}
