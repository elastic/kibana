/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Enables grounding of significant events query generation against source code indexed via
 * Semantic Code Search (SCS). When enabled and a stream is linked to a code index, the query
 * generation reasoning agent can consult the source code (through the installed SCS Kibana
 * workflows) to verify hypotheses before emitting ES|QL queries.
 */
export const SIGNIFICANT_EVENTS_SEMANTIC_CODE_SEARCH_GROUNDING_ENABLED_FLAG =
  'streams.significantEventsSemanticCodeSearchGroundingEnabled';
