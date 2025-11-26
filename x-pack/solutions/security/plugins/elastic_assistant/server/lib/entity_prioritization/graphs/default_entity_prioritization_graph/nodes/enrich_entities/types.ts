/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { entityDetailsHighlightsServiceFactory } from '@kbn/security-solution-plugin/server/lib/entity_analytics/entity_details/entity_details_highlights_service';

/**
 * Service interface for entity details highlights
 * Uses the return type of entityDetailsHighlightsServiceFactory to ensure type compatibility
 */
export type EntityDetailsHighlightsService = ReturnType<
  typeof entityDetailsHighlightsServiceFactory
>;
