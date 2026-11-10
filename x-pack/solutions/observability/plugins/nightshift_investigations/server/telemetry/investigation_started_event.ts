/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts, RootSchema } from '@kbn/core/server';

export const NIGHTSHIFT_INVESTIGATION_STARTED_EVENT = 'nightshift-investigation-started';

export interface InvestigationStartedEvent {
  investigation_id: string;
  workflow_execution_id: string;
  trigger_type: string;
  entry_point: string;
  subject_type: string;
  is_follow_up: boolean;
  automation_id?: string;
  event_id?: string;
  source_workflow_execution_id?: string;
}

const investigationStartedSchema: RootSchema<InvestigationStartedEvent> = {
  investigation_id: {
    type: 'keyword',
    _meta: { description: 'The investigation, which is its Agent Builder conversation id.' },
  },
  workflow_execution_id: {
    type: 'keyword',
    _meta: {
      description:
        'Workflow Engine execution ID of this investigation run; joins to Workflow Engine terminal telemetry.',
    },
  },
  trigger_type: {
    type: 'keyword',
    _meta: { description: 'The trigger type the run was started with: automatic or manual.' },
  },
  entry_point: {
    type: 'keyword',
    _meta: {
      description: 'What started the run: start_api, automation, slack or alert_recovery.',
    },
  },
  subject_type: {
    type: 'keyword',
    _meta: { description: 'The subject type of the investigation.' },
  },
  is_follow_up: {
    type: 'boolean',
    _meta: { description: 'Whether the run adds a round to an existing investigation.' },
  },
  automation_id: {
    type: 'keyword',
    _meta: {
      description: 'The automation that started the run, when any.',
      optional: true,
    },
  },
  event_id: {
    type: 'keyword',
    _meta: {
      description: 'The significant event that triggered the run, when any.',
      optional: true,
    },
  },
  source_workflow_execution_id: {
    type: 'keyword',
    _meta: {
      description:
        'Execution ID of the workflow that wrote the triggering significant event or alert version, when available.',
      optional: true,
    },
  },
};

export const investigationStartedEvent: EventTypeOpts<InvestigationStartedEvent> = {
  eventType: NIGHTSHIFT_INVESTIGATION_STARTED_EVENT,
  schema: investigationStartedSchema,
};
