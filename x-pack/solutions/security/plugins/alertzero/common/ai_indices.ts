/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAiIndexDest } from '@kbn/context-engine-plugin/common/ai_index_dest';

// Context Engine owns how an AI index id maps to a backing store, so ask it rather than
// rebuilding the prefix and drifting when it changes. Index ids are permanent.

/**
 * AI index for knowledge indicators one Worker hands to another. The id predates this name. These
 * managed workflow YAMLs name it by the literal, with nothing tying them to this constant:
 * `coverage_worker.yaml`, `forensics_endpoint_analysis.yaml`, `attack_discovery_review.yaml` and
 * `actions/action_handoff_to_forensics.yaml`.
 */
export const KNOWLEDGE_INDICATOR_AI_INDEX_ID = 'security-investigations' as const;

export const KNOWLEDGE_INDICATOR_AI_INDEX_DEST = getAiIndexDest(
  'index',
  KNOWLEDGE_INDICATOR_AI_INDEX_ID
);

/** AI index for Attack Discovery fingerprints, which security_solution's match step reads and writes. */
export const ATTACK_FINGERPRINT_AI_INDEX_ID = 'security-attack-fingerprints' as const;

export const ATTACK_FINGERPRINT_AI_INDEX_DEST = getAiIndexDest(
  'index',
  ATTACK_FINGERPRINT_AI_INDEX_ID
);
