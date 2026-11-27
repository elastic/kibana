/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts, RootSchema } from '@kbn/core/server';

export const NIGHTSHIFT_ALERT_OUTCOME_EVENT = 'nightshift-alert-outcome';

export type AlertOutcomeTransition = 'tracked' | 'untrackable' | 'extract_failed';

export interface AlertOutcomeEvent {
  transition: AlertOutcomeTransition;
  source?: string;
  reason?: string;
  automation_id?: string;
}

const alertOutcomeSchema: RootSchema<AlertOutcomeEvent> = {
  transition: {
    type: 'keyword',
    _meta: {
      description: 'What happened to the tracking record: tracked, untrackable or extract_failed.',
    },
  },
  source: {
    type: 'keyword',
    _meta: {
      description:
        'The alert source the extractor detected, such as elastic or pagerduty, including sources without an adapter.',
      optional: true,
    },
  },
  reason: {
    type: 'keyword',
    _meta: {
      description: 'Why the alert is untrackable (unsupported_source, not_found, ...).',
      optional: true,
    },
  },
  automation_id: {
    type: 'keyword',
    _meta: { description: 'The automation that started the investigation.', optional: true },
  },
};

export const alertOutcomeEvent: EventTypeOpts<AlertOutcomeEvent> = {
  eventType: NIGHTSHIFT_ALERT_OUTCOME_EVENT,
  schema: alertOutcomeSchema,
};
