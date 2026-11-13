/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts, RootSchema } from '@kbn/core/server';
import { modelUsageSchema, type ModelUsageFields } from './model_usage_schema';

export const NIGHTSHIFT_BACKGROUND_ACTIVITY_EVENT = 'nightshift-background-activity';

/** Online eval judges can report through this event once they ship. */
export type BackgroundActivityType =
  | 'memory_optimize'
  | 'wiki_optimize'
  | 'decision_tree_reinforcement'
  | 'findings_recorder';

export interface BackgroundActivityEvent extends ModelUsageFields {
  activity: BackgroundActivityType;
  outcome: 'success' | 'failure';
  workflow_execution_id?: string;
  conversation_id?: string;
  round_id?: string;
  duration_ms: number;
}

const backgroundActivitySchema: RootSchema<BackgroundActivityEvent> = {
  activity: {
    type: 'keyword',
    _meta: {
      description:
        'The background job: memory_optimize, wiki_optimize, decision_tree_reinforcement or findings_recorder.',
    },
  },
  outcome: {
    type: 'keyword',
    _meta: {
      description: 'failure when the job threw or returned a failed result, success otherwise.',
    },
  },
  workflow_execution_id: {
    type: 'keyword',
    _meta: {
      description:
        'Execution ID of the background workflow the job ran in. Absent for findings_recorder, which runs inside the agent run.',
      optional: true,
    },
  },
  conversation_id: {
    type: 'keyword',
    _meta: {
      description:
        'Conversation whose round the job worked on. For an investigation this is the investigation id.',
      optional: true,
    },
  },
  round_id: {
    type: 'keyword',
    _meta: { description: 'Round the job learned from, when known.', optional: true },
  },
  duration_ms: {
    type: 'long',
    _meta: { description: 'How long the job ran.' },
  },
  ...modelUsageSchema,
};

/**
 * Sent once per background LLM job that runs on behalf of a conversation round. The findings
 * recorder sends one per pass: its calls are not part of the round's usage on the ended event.
 */
export const backgroundActivityEvent: EventTypeOpts<BackgroundActivityEvent> = {
  eventType: NIGHTSHIFT_BACKGROUND_ACTIVITY_EVENT,
  schema: backgroundActivitySchema,
};
