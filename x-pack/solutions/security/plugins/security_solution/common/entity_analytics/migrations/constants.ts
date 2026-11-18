/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ENTITY_ANALYTICS_INTERNAL_RUN_MIGRATIONS_ROUTE =
  '/internal/entity_analytics/migrations/run';

/**
 * Proof of concept: runs the same Asset Criticality mappings migration through
 * `@kbn/es-index-migration` instead of the hand-written client, so the two can be
 * invoked in separate spaces and their results compared.
 */
export const ENTITY_ANALYTICS_INTERNAL_RUN_LIBRARY_MIGRATION_ROUTE =
  '/internal/entity_analytics/migrations/run_library';
