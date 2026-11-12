/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/server';
import type { ModelUsageSummary } from '../lib/model_usage_collector';

export type ModelUsageFields = Partial<ModelUsageSummary>;

/** LLM usage fields shared by the Nightshift cost events. Optional: usage can be unreadable. */
export const modelUsageSchema: RootSchema<ModelUsageFields> = {
  connector_id: {
    type: 'keyword',
    _meta: { description: 'Connector of the LLM calls.', optional: true },
  },
  model: {
    type: 'keyword',
    _meta: { description: 'Model reported by the provider, when available.', optional: true },
  },
  llm_calls: {
    type: 'long',
    _meta: { description: 'Number of LLM calls.', optional: true },
  },
  input_tokens: {
    type: 'long',
    _meta: { description: 'Input tokens, including cached ones.', optional: true },
  },
  output_tokens: {
    type: 'long',
    _meta: { description: 'Output tokens, including reasoning ones.', optional: true },
  },
  cached_input_tokens: {
    type: 'long',
    _meta: {
      description: 'Input tokens served from cache. Subset of input_tokens.',
      optional: true,
    },
  },
  reasoning_tokens: {
    type: 'long',
    _meta: { description: 'Reasoning tokens. Subset of output_tokens.', optional: true },
  },
};
