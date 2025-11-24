/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// LangGraph metadata
export const THREAT_HUNTING_PRIORITIES_GRAPH_RUN_NAME = 'Threat hunting priorities';
export const THREAT_HUNTING_PRIORITIES_TAG = 'threat-hunting-priorities';

// Node types specific to threat hunting priorities graph
export const ThreatHuntingPrioritiesNodeType = {
  FIND_AND_SELECT_CANDIDATES_NODE: 'find_and_select_candidates',
  ENRICH_ENTITIES_NODE: 'enrich_entities',
  GENERATE_PRIORITIES_NODE: 'generate_priorities',
} as const;

// Limits
export const DEFAULT_MAX_GENERATION_ATTEMPTS = 10;
export const DEFAULT_MAX_HALLUCINATION_FAILURES = 5;
export const DEFAULT_MAX_REPEATED_GENERATIONS = 3;
