/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts, RootSchema } from '@kbn/core/server';
import type { RootCauseChange } from '../investigation_round';

export const NIGHTSHIFT_DECISION_TREE_CAUSAL_CHECK_EVENT = 'nightshift-decision-tree-causal-check';

/** Maximum Unicode codepoints per text field so the event stays well within the EBT batch limit. */
export const MAX_CAUSAL_CHECK_EXPLANATION_LENGTH = 500;

/**
 * Mutually-exclusive funnel outcome for a follow-up round entering decision-tree preparation:
 * - `confirmed`: feedback stated a root cause and tool results in the transcript backed it up
 *   (reinforces the causal path with verified markers).
 * - `unconfirmed_feedback`: feedback stated a root cause, but tool results did not substantiate it
 *   (extends the tree without claiming causality).
 * - `not_feedback`: follow-up was a question, acknowledgement, or non-causal update
 *   (extends the tree without claiming causality).
 * - `skipped_no_trees`: follow-up belonged to an investigation with no editable decision trees
 *   (skips both the causal-check LLM call and the reinforcement agent).
 * - `failed`: causal-check model resolution, inference call, or timeout failed, or the workflow
 *   execution was cancelled mid-check (falls back to extending the tree without claiming causality).
 */
export type CausalCheckOutcome =
  | 'confirmed'
  | 'unconfirmed_feedback'
  | 'not_feedback'
  | 'skipped_no_trees'
  | 'failed';

/**
 * Coded failure reason when `outcome` is `failed`. Raw error messages are never sent. `cancelled`
 * is the workflow execution being aborted, not a model or connector fault.
 */
export type CausalCheckErrorCode =
  | 'model_unavailable'
  | 'timeout'
  | 'cancelled'
  | 'inference_error';

export interface DecisionTreeCausalCheckEvent {
  agent_id: string;
  conversation_id?: string;
  round_id?: string;
  workflow_execution_id?: string;
  outcome: CausalCheckOutcome;
  is_feedback?: boolean;
  causal_confirmed?: boolean;
  has_learning?: boolean;
  causal_summary?: string;
  learning?: string;
  tree_count: number;
  opened_tree_count: number;
  recorder_outcome?: RootCauseChange;
  recorder_has_confirmed_cause?: boolean;
  duration_ms?: number;
  error_code?: CausalCheckErrorCode;
}

const decisionTreeCausalCheckSchema: RootSchema<DecisionTreeCausalCheckEvent> = {
  agent_id: {
    type: 'keyword',
    _meta: { description: 'Agent that produced the follow-up round.' },
  },
  conversation_id: {
    type: 'keyword',
    _meta: {
      description: 'Investigation (Agent Builder conversation) the round belongs to.',
      optional: true,
    },
  },
  round_id: {
    type: 'keyword',
    _meta: {
      description: 'Completed Agent Builder round id evaluated by the causal check.',
      optional: true,
    },
  },
  workflow_execution_id: {
    type: 'keyword',
    _meta: {
      description: 'Execution id of the post-round optimize workflow.',
      optional: true,
    },
  },
  outcome: {
    type: 'keyword',
    _meta: {
      description:
        'Funnel outcome: confirmed, unconfirmed_feedback, not_feedback, skipped_no_trees, or failed.',
    },
  },
  is_feedback: {
    type: 'boolean',
    _meta: {
      description: 'Whether the causal-check model classified the message as root-cause feedback.',
      optional: true,
    },
  },
  causal_confirmed: {
    type: 'boolean',
    _meta: {
      description: 'Whether tool results in the transcript confirmed the causal claim.',
      optional: true,
    },
  },
  has_learning: {
    type: 'boolean',
    _meta: {
      description: 'Whether the causal check extracted a non-empty learning summary.',
      optional: true,
    },
  },
  causal_summary: {
    type: 'text',
    _meta: {
      description:
        'Causal-check summary, truncated. Only sent where the nightshift.decisionTrees.includeExplanations flag is on, because it may quote customer data.',
      optional: true,
    },
  },
  learning: {
    type: 'text',
    _meta: {
      description:
        'Extracted learning insight, truncated. Only sent where the nightshift.decisionTrees.includeExplanations flag is on, because it may quote customer data.',
      optional: true,
    },
  },
  tree_count: {
    type: 'long',
    _meta: {
      description: 'Editable decision trees in scope for this investigation follow-up.',
    },
  },
  opened_tree_count: {
    type: 'long',
    _meta: {
      description: 'Editable decision trees opened by the investigator during this round.',
    },
  },
  recorder_outcome: {
    type: 'keyword',
    _meta: {
      description:
        'Findings-recorder hypothesis transition for the round: found, changed, withdrawn, unchanged, or unknown.',
      optional: true,
    },
  },
  recorder_has_confirmed_cause: {
    type: 'boolean',
    _meta: {
      description:
        'Whether the findings recorder held at least one confirmed hypothesis after the round.',
      optional: true,
    },
  },
  duration_ms: {
    type: 'long',
    _meta: {
      description: 'Elapsed wall-clock time of the causal-check LLM step in milliseconds.',
      optional: true,
    },
  },
  error_code: {
    type: 'keyword',
    _meta: {
      description:
        'Coded failure category when outcome is failed: model_unavailable, timeout, cancelled, or inference_error.',
      optional: true,
    },
  },
};

export const decisionTreeCausalCheckEvent: EventTypeOpts<DecisionTreeCausalCheckEvent> = {
  eventType: NIGHTSHIFT_DECISION_TREE_CAUSAL_CHECK_EVENT,
  schema: decisionTreeCausalCheckSchema,
};
