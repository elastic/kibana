/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Ids and routes are inlined rather than imported from the owning plugins: this
// functional-tests package takes no runtime dependency on them. They mirror:
//   - the managed workflow id (@kbn/workflows/managed, attack_discovery_batched_generation.yaml)
//   - the workflows_management public API version
//   - ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_FIND (@kbn/elastic-assistant-common)
//   - ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID / ALERTZERO_TEMPLATE_INFERENCE_FEATURE_ID (@kbn/alertzero-common)

export const BATCHED_GENERATION_WORKFLOW_ID = 'system-security-attack-discovery-batched-generation';

export const PUBLIC_API_VERSION = '2023-10-31';

export const ALERTS_INDEX = '.alerts-security.alerts-default';

/** Where the run step persists ad hoc discoveries; `fetch_discoveries` reads it. */
export const ADHOC_DISCOVERIES_INDEX = '.adhoc.alerts-security.attack.discovery.alerts-default';

/** Data stream the inference plugin writes one document per model call to. */
export const TOKEN_USAGE_INDEX = '.kibana-inference-token-usage';

export const ANONYMIZATION_FIELDS_FIND_ROUTE =
  '/api/security_ai_assistant/anonymization_fields/_find';

export const anonymizationFieldsIndexForSpace = (space: string): string =>
  `.kibana-elastic-ai-assistant-anonymization-fields-${space}`;
