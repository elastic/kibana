/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/server';
import type { ModelUsageSummary } from '../lib/model_usage_collector';

export type ModelUsageFields = Partial<ModelUsageSummary>;

/**
 * LLM usage fields shared by the Nightshift cost events. Optional: usage can be unreadable, and
 * unknown usage is left off rather than reported as zero.
 */
export const modelUsageSchema: RootSchema<ModelUsageFields> = {
  connector_id: {
    type: 'keyword',
    _meta: {
      description:
        'Main connector of the LLM calls. An agent round can also call a second connector (the fast model); the token fields sum every connector under this one.',
      optional: true,
    },
  },
  model: {
    type: 'keyword',
    _meta: {
      description:
        'Model of the main connector as the provider reports it, when available. Tokens of other connectors in the same round are summed under it.',
      optional: true,
    },
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
