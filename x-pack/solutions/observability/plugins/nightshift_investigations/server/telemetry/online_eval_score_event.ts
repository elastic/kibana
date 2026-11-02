/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts, RootSchema } from '@kbn/core/server';
import type { OnlineEvalsRoundKind } from '../online_evals/classify_round';

export const NIGHTSHIFT_ONLINE_EVAL_SCORE_EVENT = 'nightshift-investigation-eval-score';

/** Which investigation report the judges graded. */
export type OnlineEvalGradedReport = 'first_round' | 'pre_recovery' | 'current';

/** How the investigation run that was scored started. */
export type OnlineEvalEntryPoint = 'start_api' | 'automation' | 'slack' | 'alert_recovery';

/**
 * Why an evaluator produced no score. `evidence_unmet` counts as skipped: the round didn't have
 * what the evaluator grades. Error messages are never sent, because they can quote evidence.
 */
export type OnlineEvalErrorCode = 'evidence_unmet' | 'evaluator_error';

export interface OnlineEvalScore {
  evaluator_name: string;
  evaluator_version: string;
  name: string;
  value?: number;
  label?: string;
  explanation?: string;
}

export interface OnlineEvalError {
  evaluator_name: string;
  evaluator_version: string;
  code: OnlineEvalErrorCode;
}

/**
 * One scored investigation run. Project, organization, cluster and Kibana version come from the
 * analytics context every event carries, so they aren't repeated here.
 */
export interface OnlineEvalScoreEvent {
  investigation_id: string;
  round_id: string;
  round_trace_id?: string;
  judge_trace_id?: string;
  workflow_execution_id: string;
  investigation_execution_id?: string;
  space_id: string;
  agent_id?: string;
  evaluator_set: string;
  round_kind: OnlineEvalsRoundKind;
  graded_report: OnlineEvalGradedReport;
  entry_point?: OnlineEvalEntryPoint;
  alert_rule_type?: string;
  judge_connector_id?: string;
  judge_model?: string;
  scores: OnlineEvalScore[];
  evaluator_count: number;
  failed_count: number;
  skipped_count: number;
  errors: OnlineEvalError[];
  explanations_included: boolean;
  explanations_dropped?: number;
  scores_dropped?: number;
  investigation_started_at: string;
  investigation_ended_at?: string;
  scoring_duration_ms: number;
}

const evaluatorNameSchema = {
  type: 'keyword' as const,
  _meta: { description: 'Name of the evaluator.' },
};

const evaluatorVersionSchema = {
  type: 'keyword' as const,
  _meta: { description: 'Version of the evaluator.' },
};

const onlineEvalScoreSchema: RootSchema<OnlineEvalScoreEvent> = {
  investigation_id: {
    type: 'keyword',
    _meta: { description: 'Investigation (Agent Builder conversation) that was scored.' },
  },
  round_id: {
    type: 'keyword',
    _meta: { description: 'Round the scored investigation run created.' },
  },
  round_trace_id: {
    type: 'keyword',
    _meta: { description: 'Trace of the scored round.', optional: true },
  },
  judge_trace_id: {
    type: 'keyword',
    _meta: { description: 'Trace of the judge calls.', optional: true },
  },
  workflow_execution_id: {
    type: 'keyword',
    _meta: { description: 'Execution of the scoring workflow.' },
  },
  investigation_execution_id: {
    type: 'keyword',
    _meta: {
      description: 'Execution of the investigation workflow that was scored.',
      optional: true,
    },
  },
  space_id: {
    type: 'keyword',
    _meta: { description: 'Space the investigation belongs to.' },
  },
  agent_id: {
    type: 'keyword',
    _meta: { description: 'Agent that ran the investigation.', optional: true },
  },
  evaluator_set: {
    type: 'keyword',
    _meta: { description: 'Set of evaluators that ran, such as reference_free or alert_outcome.' },
  },
  round_kind: {
    type: 'keyword',
    _meta: { description: 'Kind of round that was scored: initial, follow_up or alert_recovery.' },
  },
  graded_report: {
    type: 'keyword',
    _meta: { description: 'Report the judges graded: first_round, pre_recovery or current.' },
  },
  entry_point: {
    type: 'keyword',
    _meta: {
      description: 'How the scored run started: start_api, automation, slack or alert_recovery.',
      optional: true,
    },
  },
  alert_rule_type: {
    type: 'keyword',
    _meta: { description: 'Rule type of the alert that was investigated.', optional: true },
  },
  judge_connector_id: {
    type: 'keyword',
    _meta: { description: 'Connector the judges called.', optional: true },
  },
  judge_model: {
    type: 'keyword',
    _meta: { description: 'Model the judges ran on.', optional: true },
  },
  scores: {
    type: 'array',
    items: {
      properties: {
        evaluator_name: evaluatorNameSchema,
        evaluator_version: evaluatorVersionSchema,
        name: {
          type: 'keyword',
          _meta: { description: 'Name of the score.' },
        },
        value: {
          type: 'double',
          _meta: { description: 'Value of the score.', optional: true },
        },
        label: {
          type: 'keyword',
          _meta: { description: 'Label of the score.', optional: true },
        },
        explanation: {
          type: 'text',
          _meta: {
            description:
              "Judge's explanation, truncated. Only sent where the nightshift.onlineEvals.includeExplanations flag is on, because it may quote customer data.",
            optional: true,
          },
        },
      },
    },
  },
  evaluator_count: {
    type: 'long',
    _meta: { description: 'Evaluators that ran.' },
  },
  failed_count: {
    type: 'long',
    _meta: { description: 'Evaluators that failed.' },
  },
  skipped_count: {
    type: 'long',
    _meta: { description: "Evaluators skipped because the round didn't have what they grade." },
  },
  errors: {
    type: 'array',
    items: {
      properties: {
        evaluator_name: evaluatorNameSchema,
        evaluator_version: evaluatorVersionSchema,
        code: {
          type: 'keyword',
          _meta: { description: 'Error code: evidence_unmet (skipped) or evaluator_error.' },
        },
      },
    },
  },
  explanations_included: {
    type: 'boolean',
    _meta: { description: 'Whether explanations were allowed for this project.' },
  },
  explanations_dropped: {
    type: 'long',
    _meta: {
      description: 'Explanations left out to keep the event within the size limit.',
      optional: true,
    },
  },
  scores_dropped: {
    type: 'long',
    _meta: {
      description: 'Scores left out to keep the event within the size limit.',
      optional: true,
    },
  },
  investigation_started_at: {
    type: 'date',
    _meta: { description: 'When the scored investigation run started.' },
  },
  investigation_ended_at: {
    type: 'date',
    _meta: { description: 'When the scored investigation run ended.', optional: true },
  },
  scoring_duration_ms: {
    type: 'long',
    _meta: { description: 'How long scoring took, in milliseconds.' },
  },
};

export const onlineEvalScoreEvent: EventTypeOpts<OnlineEvalScoreEvent> = {
  eventType: NIGHTSHIFT_ONLINE_EVAL_SCORE_EVENT,
  schema: onlineEvalScoreSchema,
};
