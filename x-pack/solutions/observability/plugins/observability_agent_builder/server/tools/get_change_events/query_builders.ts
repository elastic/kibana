/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';

/**
 * Creates an environment filter that checks both ECS (service.environment)
 * and OTel (deployment.environment.name) conventions.
 */
export function environmentFilter(environment?: string): QueryDslQueryContainer[] {
  if (!environment) {
    return [];
  }
  return [
    {
      bool: {
        minimum_should_match: 1,
        should: [
          { term: { 'service.environment': environment } },
          { term: { 'deployment.environment.name': environment } },
          { term: { 'deployment.environment': environment } }, // Support deprecated OTel field
        ],
      },
    },
  ];
}

/**
 * Joins APM transaction and span indices into a single comma-separated string.
 */
export function getTraceIndices(apmIndices: { transaction: string; span: string }): string {
  return [apmIndices.transaction, apmIndices.span].join(',');
}
