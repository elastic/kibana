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
 * The gateway requires `maxLength` on every string and rejects a
 * `template.variables` body over {@link HUNT_TEMPLATE_VARIABLES_MAX_BYTES}.
 * The constants below are the `maxLength` values the yaml must copy. Callers
 * clamp to them before the request. Each template's maxLengths sum to well
 * under 1 MiB, so the default variables cap is enough and a long report is
 * not a 400.
 *
 * The template path runs `schema.parse` on the model text, so the yaml's
 * return shape has to match these objects. Unknown keys are ignored. A missing
 * required field or a number outside 0..1 fails the parse.
 *
 * `.hunt-dataset-match`
 * - `vendor` <= 512, `product` <= 512, `datasets` <= 48000,
 *   `techniques` <= 4000, `iocs` <= 8000, `report_text` <= 6000.
 * - Returns `{ datasets: [{ dataset: string, confidence: number }] }`.
 *   `confidence` is from 0 to 1 inclusive. `datasets` may be empty.
 *
 * `.hunt-behavior-extraction`
 * - `environment_context` <= 120000 (50 sampled events of 2048 chars, plus the
 *   preamble). `report_text` <= 200000, the route's report-text cap.
 * - Returns `{ candidates: [{ technique_id: string, evidence_quote: string, llm_confidence: number }] }`.
 *   `llm_confidence` is from 0 to 1 inclusive. `candidates` may be omitted and
 *   then reads as `[]`.
 *
 * `.hunt-recommendations`
 * - `context` <= 64000.
 * - Returns `{ recommendations: [{ text: string, entities_referenced: string[] }] }`.
 *   `text` is 1..2000 characters. `entities_referenced` has at most 20 strings
 *   of 1..256 characters and may be omitted. `recommendations` has at most 8
 *   lines and may be omitted.
 */

/** Gateway default cap on the serialized `template.variables` object. */
export const HUNT_TEMPLATE_VARIABLES_MAX_BYTES = 1_048_576;

export const HUNT_DATASET_MATCH_VENDOR_MAX_CHARS = 512;
export const HUNT_DATASET_MATCH_PRODUCT_MAX_CHARS = 512;
export const HUNT_DATASET_MATCH_DATASETS_MAX_CHARS = 48_000;
export const HUNT_DATASET_MATCH_TECHNIQUES_MAX_CHARS = 4_000;
export const HUNT_DATASET_MATCH_IOCS_MAX_CHARS = 8_000;
export const HUNT_DATASET_MATCH_REPORT_TEXT_MAX_CHARS = 6_000;

export const HUNT_EXTRACTION_ENVIRONMENT_CONTEXT_MAX_CHARS = 120_000;
export const HUNT_EXTRACTION_REPORT_TEXT_MAX_CHARS = 200_000;

export const HUNT_RECOMMENDATIONS_CONTEXT_MAX_CHARS = 64_000;

export const HUNT_DATASET_MATCH_TEMPLATE_ID = '.hunt-dataset-match';
export const HUNT_BEHAVIOR_EXTRACTION_TEMPLATE_ID = '.hunt-behavior-extraction';
export const HUNT_RECOMMENDATIONS_TEMPLATE_ID = '.hunt-recommendations';

export const HUNT_PROMPT_TEMPLATE_VERSION = 1;

/** Cuts a template variable to the `maxLength` the gateway schema will accept. */
export const clampHuntTemplateString = (value: string, maxChars: number): string =>
  value.length > maxChars ? value.slice(0, maxChars) : value;
