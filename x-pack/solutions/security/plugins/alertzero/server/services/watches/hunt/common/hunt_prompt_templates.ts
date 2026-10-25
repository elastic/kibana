/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * EIS prompt templates for Hunt Watch. The files live in eis-gateway under
 * `prompt-templates/<name>/1.yaml`. Kibana only pins the id, version, and
 * variables. A template-required endpoint rejects a caller-written prompt, so
 * these ids are sent only when the selected connector advertises
 * `capabilities.templates.policy: required`.
 *
 * Variable names are the gateway contract:
 * - `.hunt-dataset-match`: `vendor`, `product`, `datasets`, `techniques`, `iocs`, `report_text`
 * - `.hunt-behavior-extraction`: `environment_context`, `report_text`
 * - `.hunt-recommendations`: `context`
 *
 * Each template returns one JSON object. Dataset match returns
 * `{ datasets: [{ dataset, confidence }] }`. Extraction returns
 * `{ candidates: [{ technique_id, evidence_quote, llm_confidence }] }`.
 * Recommendations return `{ recommendations: [{ text, entities_referenced }] }`.
 */

export const HUNT_DATASET_MATCH_TEMPLATE_ID = '.hunt-dataset-match';
export const HUNT_BEHAVIOR_EXTRACTION_TEMPLATE_ID = '.hunt-behavior-extraction';
export const HUNT_RECOMMENDATIONS_TEMPLATE_ID = '.hunt-recommendations';

export const HUNT_PROMPT_TEMPLATE_VERSION = 1;
