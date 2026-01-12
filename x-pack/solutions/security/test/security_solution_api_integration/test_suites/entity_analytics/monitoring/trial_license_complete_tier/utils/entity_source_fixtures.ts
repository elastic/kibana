/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CreateEntitySourceRequestBody } from '@kbn/security-solution-plugin/common/api/entity_analytics/monitoring/monitoring_entity_source/monitoring_entity_source.gen';

export function createIndexEntitySource(
  indexPattern: string,
  overrides: Partial<CreateEntitySourceRequestBody> = {}
): CreateEntitySourceRequestBody {
  return {
    type: 'index',
    name: 'PrivilegedUsers',
    indexPattern,
    enabled: true,
    matchers: [{ fields: ['user.role'], values: ['admin'] }],
    filter: {},
    ...overrides,
  };
}
