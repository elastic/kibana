/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAiIndexDest } from '@kbn/context-engine-plugin/common/ai_index_dest';

/**
 * AI index for knowledge indicators one Worker hands to another. The id predates this name and is
 * permanent; managed workflow YAML names it by this literal.
 */
export const KNOWLEDGE_INDICATOR_AI_INDEX_ID = 'security-investigations' as const;

// Context Engine owns how an AI index id maps to a backing store, so ask it rather than
// rebuilding the prefix here and drifting when it changes.
export const KNOWLEDGE_INDICATOR_AI_INDEX_DEST = getAiIndexDest(
  'index',
  KNOWLEDGE_INDICATOR_AI_INDEX_ID
);
