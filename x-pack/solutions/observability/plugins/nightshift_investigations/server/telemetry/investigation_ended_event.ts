/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts, RootSchema } from '@kbn/core/server';
import { modelUsageSchema, type ModelUsageFields } from './model_usage_schema';

export const NIGHTSHIFT_INVESTIGATION_ENDED_EVENT = 'nightshift-investigation-ended';

export type InvestigationRunOutcome = 'completed' | 'failed';

export interface InvestigationEndedEvent extends ModelUsageFields {
  investigation_id: string;
  workflow_execution_id: string;
  parent_workflow_execution_id?: string;
  outcome: InvestigationRunOutcome;
  trigger_type?: string;
  entry_point?: string;
  subject_type?: string;
  is_follow_up?: boolean;
  automation_id?: string;
  duration_ms?: number;
}

const investigationEndedSchema: RootSchema<InvestigationEndedEvent> = {
  investigation_id: {
    type: 'keyword',
    _meta: { description: 'The investigation, which is its Agent Builder conversation id.' },
  },
  workflow_execution_id: {
    type: 'keyword',
    _meta: {
      description:
        'Workflow Engine execution ID of the investigation workflow run. The started event carries the id of the run that started it; join on parent_workflow_execution_id.',
    },
  },
  parent_workflow_execution_id: {
    type: 'keyword',
    _meta: {
      description:
        "Execution ID of the run that started this one: the space's entry point, whose id the started event carries as workflow_execution_id, or the Slack thread workflow for a Slack reply.",
      optional: true,
    },
  },
  outcome: {
    type: 'keyword',
    _meta: { description: 'How the run ended: completed or failed.' },
  },
  trigger_type: {
    type: 'keyword',
    _meta: { description: 'The trigger type the run was started with.', optional: true },
  },
  entry_point: {
    type: 'keyword',
    _meta: {
      description: 'What started the run: start_api, automation, slack or alert_recovery.',
      optional: true,
    },
  },
  subject_type: {
    type: 'keyword',
    _meta: { description: 'The subject type the run was started for.', optional: true },
  },
  is_follow_up: {
    type: 'boolean',
    _meta: {
      description: 'Whether the run added a round to an investigation that already had one.',
      optional: true,
    },
  },
  automation_id: {
    type: 'keyword',
    _meta: { description: 'The automation that started the run, when any.', optional: true },
  },
  duration_ms: {
    type: 'long',
    _meta: { description: 'Time from the run starting to it ending.', optional: true },
  },
  ...modelUsageSchema,
};

/**
 * Sent once per investigation run when it completes or fails, with the token usage of the run's
 * agent round. A timed-out or cancelled run sends none, so a started event with no ended event
 * whose `parent_workflow_execution_id` matches is such a run. The findings recorder's calls are
 * reported per pass on `nightshift-background-activity`.
 */
export const investigationEndedEvent: EventTypeOpts<InvestigationEndedEvent> = {
  eventType: NIGHTSHIFT_INVESTIGATION_ENDED_EVENT,
  schema: investigationEndedSchema,
};
