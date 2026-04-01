/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Well-known workflow IDs for Attack Discovery out-of-the-box workflows.
 * These workflows are registered on plugin startup.
 */

/** Default validation workflow - validates and persists discoveries to Elasticsearch index */
export const ATTACK_DISCOVERY_DEFAULT_VALIDATION_WORKFLOW_ID = 'attack-discovery-validate';

/**
 * Validation workflow ID used by the UI to link to workflow executions.
 * Alias for the out-of-the-box validation workflow.
 */
export const ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID =
  ATTACK_DISCOVERY_DEFAULT_VALIDATION_WORKFLOW_ID;

/** ES|QL example alert retrieval workflow - demonstrates custom retrieval using ES|QL */
export const ATTACK_DISCOVERY_ESQL_EXAMPLE_WORKFLOW_ID = 'attack-discovery-esql-example';

/** Default alert retrieval workflow - retrieves and anonymizes alerts using built-in logic */
export const ATTACK_DISCOVERY_DEFAULT_ALERT_RETRIEVAL_WORKFLOW_ID =
  'default-attack-discovery-alert-retrieval';

/** Example: custom validation workflow - demonstrates composable validate → transform → persist */
export const ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW_ID =
  'attack-discovery-custom-validation-example';

/** Generation workflow - runs LLM generation with pre-retrieved alerts */
export const ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID = 'attack-discovery-generation';

/** Example: run step workflow - demonstrates attack-discovery.run in sync mode */
export const ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID = 'attack-discovery-run-example';
