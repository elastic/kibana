/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Product-recommended inference endpoints for the AlertZero model tiers.
 *
 * They live here, not in the AlertZero plugin, so Security features registered by other plugins
 * (e.g. the `attack_discovery` Model Settings row) recommend the same models even when AlertZero is
 * disabled, as it is in serverless tiers other than Complete.
 *
 * Every endpoint below is a literal. `defaultInferenceEndpoints` has constants for only a few
 * current-generation endpoints, and a constant would not prove the endpoint is provisioned
 * anyway. GA dates are informational; an endpoint that is also in an Agent Builder recommended list
 * (`AGENT_BUILDER_RECOMMENDED_ENDPOINTS` or `AGENT_BUILDER_FAST_RECOMMENDED_ENDPOINTS`) carries the
 * same date as that list.
 *
 * Each list is the product-recommended default for its tier and spans at least two vendors, so a
 * tier that loses a vendor degrades to a comparable model from another one rather than collapsing
 * onto the cluster default.
 */

// The efficient tier takes the highest-volume and lowest-stakes calls we make, so every model here
// is small: a mid-size or frontier fallback would silently bill the high-volume path at those rates.
export const ALERTZERO_EFFICIENT_RECOMMENDED_ENDPOINTS: readonly string[] = [
  '.openai-gpt-6-luna-chat_completion', // GPT-6 Luna, GA 2026-09-28
  '.google-gemini-3.5-flash-lite-chat_completion', // Gemini 3.5 Flash Lite, GA 2026-07-21
  '.anthropic-claude-4.5-haiku-chat_completion', // Claude Haiku 4.5, GA 2025-10-01
];

// The balanced tier covers calls where accuracy matters but which either run often (triaging every
// alert) or loop over many tool rounds (diagnosing a rule), so frontier latency and cost would
// multiply by the call or round count. A strong mid-size model is the right rung.
export const ALERTZERO_BALANCED_RECOMMENDED_ENDPOINTS: readonly string[] = [
  '.anthropic-claude-5.5-sonnet-chat_completion', // Claude Sonnet 5.5, GA 2026-09-28
  '.openai-gpt-5.6-terra-chat_completion', // GPT-5.6 Terra
  '.google-gemini-3.6-flash-chat_completion', // Gemini 3.6 Flash
];

// Attack Discovery reads a whole batch of alerts and rule creation drafts an ES|QL rule from a gap
// description, both single-pass and both judged on the quality of one output, so every model here
// is frontier-class. GPT-6 Sol leads as the cheapest model with no significant loss to Opus on
// this tier's workers in the 2026-11 eval refresh. Opus sits last so losing OpenAI still leaves a
// frontier model, not a mid-size one. This list is also what the `attack_discovery` Model Settings
// row (Security Solution) recommends, so changing it also changes Attack Discovery's default model
// outside AlertZero.
export const ALERTZERO_FRONTIER_RECOMMENDED_ENDPOINTS: readonly string[] = [
  '.openai-gpt-6-sol-chat_completion', // GPT-6 Sol, GA 2026-09-28
  '.openai-gpt-5.6-sol-chat_completion', // GPT-5.6 Sol, GA 2026-07-09
  '.anthropic-claude-5-opus-chat_completion', // Claude Opus 5, GA 2026-07-24
];
