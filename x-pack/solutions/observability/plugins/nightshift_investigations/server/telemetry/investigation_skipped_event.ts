/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts, RootSchema } from '@kbn/core/server';

export const NIGHTSHIFT_INVESTIGATION_SKIPPED_EVENT = 'nightshift-investigation-skipped';

export type InvestigationSkipReason = 'deployment_quota' | 'automation_daily_limit';

export interface InvestigationSkippedEvent {
  trigger: 'automation' | 'manual';
  origin: string;
  automation_id?: string;
  skip_reason: InvestigationSkipReason;
}

const investigationSkippedSchema: RootSchema<InvestigationSkippedEvent> = {
  trigger: {
    type: 'keyword',
    _meta: { description: 'What started the investigation: automation or manual.' },
  },
  origin: {
    type: 'keyword',
    _meta: { description: 'The subject type of the skipped investigation.' },
  },
  automation_id: {
    type: 'keyword',
    _meta: {
      description: 'The automation that started the investigation, when any.',
      optional: true,
    },
  },
  skip_reason: {
    type: 'keyword',
    _meta: {
      description: 'Why the investigation was skipped: deployment_quota or automation_daily_limit.',
    },
  },
};

export const investigationSkippedEvent: EventTypeOpts<InvestigationSkippedEvent> = {
  eventType: NIGHTSHIFT_INVESTIGATION_SKIPPED_EVENT,
  schema: investigationSkippedSchema,
};
