/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts, RootSchema } from '@kbn/core/server';

export const NIGHTSHIFT_ONLINE_EVALS_STEP_FAILED_EVENT = 'nightshift-online-evals-step-failed';

export type OnlineEvalsStep = 'classify_round' | 'score';

/** Why an online evals step gave up. Error messages are never sent, because they can quote data. */
export type OnlineEvalsStepFailureCode =
  | 'invalid_input'
  | 'agent_builder_unavailable'
  | 'investigation_unavailable'
  | 'unexpected';

/** An online evals step that failed and returned without scoring, instead of failing its workflow. */
export interface OnlineEvalsStepFailedEvent {
  step: OnlineEvalsStep;
  code: OnlineEvalsStepFailureCode;
  investigation_id?: string;
  round_id?: string;
  workflow_execution_id?: string;
  space_id?: string;
}

const onlineEvalsStepFailedSchema: RootSchema<OnlineEvalsStepFailedEvent> = {
  step: {
    type: 'keyword',
    _meta: { description: 'The step that failed: classify_round or score.' },
  },
  code: {
    type: 'keyword',
    _meta: {
      description:
        'Why it failed: invalid_input, agent_builder_unavailable, investigation_unavailable or unexpected.',
    },
  },
  investigation_id: {
    type: 'keyword',
    _meta: { description: 'The investigation the step ran for, when known.', optional: true },
  },
  round_id: {
    type: 'keyword',
    _meta: { description: 'The round the step ran for, when known.', optional: true },
  },
  workflow_execution_id: {
    type: 'keyword',
    _meta: { description: 'The workflow run the step belongs to, when known.', optional: true },
  },
  space_id: {
    type: 'keyword',
    _meta: { description: 'The space the workflow ran in, when known.', optional: true },
  },
};

export const onlineEvalsStepFailedEvent: EventTypeOpts<OnlineEvalsStepFailedEvent> = {
  eventType: NIGHTSHIFT_ONLINE_EVALS_STEP_FAILED_EVENT,
  schema: onlineEvalsStepFailedSchema,
};
