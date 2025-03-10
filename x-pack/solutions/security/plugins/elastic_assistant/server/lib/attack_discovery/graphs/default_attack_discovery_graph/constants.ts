/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// LangGraph metadata
export const ATTACK_DISCOVERY_GRAPH_RUN_NAME = 'Attack discovery';
export const ATTACK_DISCOVERY_TAG = 'attack-discovery';

// Limits
export const DEFAULT_MAX_GENERATION_ATTEMPTS = 10;
export const DEFAULT_MAX_HALLUCINATION_FAILURES = 5;
export const DEFAULT_MAX_REPEATED_GENERATIONS = 3;

export const NodeType = {
  GENERATE_NODE: 'generate',
  REFINE_NODE: 'refine',
  RETRIEVE_ANONYMIZED_ALERTS_NODE: 'retrieve_anonymized_alerts',
} as const;
