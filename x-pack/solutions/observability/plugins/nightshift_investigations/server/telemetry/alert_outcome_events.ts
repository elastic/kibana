/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts, RootSchema } from '@kbn/core/server';

export const NIGHTSHIFT_ALERT_OUTCOME_EVENT = 'nightshift-alert-outcome';
export const NIGHTSHIFT_ALERT_OUTCOME_CHECKS_EVENT = 'nightshift-alert-outcome-checks';

export type AlertOutcomeTransition =
  | 'tracked'
  | 'untrackable'
  | 'extract_failed'
  | 'recovered'
  | 'stopped';

export interface AlertOutcomeEvent {
  transition: AlertOutcomeTransition;
  source?: string;
  reason?: string;
  automation_id?: string;
  detection_lag_seconds?: number;
  tracked_seconds?: number;
}

const alertOutcomeSchema: RootSchema<AlertOutcomeEvent> = {
  transition: {
    type: 'keyword',
    _meta: {
      description:
        'What happened to the tracking record: tracked, untrackable, extract_failed, recovered or stopped.',
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
      description:
        'Why the alert is untrackable (unsupported_source, not_found, ...) or why tracking stopped (stale, expired, access_lost, ...).',
      optional: true,
    },
  },
  automation_id: {
    type: 'keyword',
    _meta: { description: 'The automation that started the investigation.', optional: true },
  },
  detection_lag_seconds: {
    type: 'long',
    _meta: {
      description:
        'Seconds from the recovery time the source reported to the check that saw it, for recovered.',
      optional: true,
    },
  },
  tracked_seconds: {
    type: 'long',
    _meta: {
      description: 'Seconds from the post to the recovery or stop, for recovered and stopped.',
      optional: true,
    },
  },
};

export const alertOutcomeEvent: EventTypeOpts<AlertOutcomeEvent> = {
  eventType: NIGHTSHIFT_ALERT_OUTCOME_EVENT,
  schema: alertOutcomeSchema,
};

export interface AlertOutcomeChecksEvent {
  source: string;
  checked: number;
  firing: number;
  recovered: number;
  stale: number;
  unknown: number;
  errors: number;
}

const count = (description: string) => ({ type: 'long' as const, _meta: { description } });

const alertOutcomeChecksSchema: RootSchema<AlertOutcomeChecksEvent> = {
  source: { type: 'keyword', _meta: { description: 'The alert source that was checked.' } },
  checked: count('Tracking records checked against the source in one poll.'),
  firing: count('Checks that found the alert still firing.'),
  recovered: count('Checks that found the alert recovered.'),
  stale: count('Checks that found the alert not updated for a day.'),
  unknown: count('Checks that could not tell the alert state.'),
  errors: count('Checks that failed, such as connector or auth errors.'),
};

export const alertOutcomeChecksEvent: EventTypeOpts<AlertOutcomeChecksEvent> = {
  eventType: NIGHTSHIFT_ALERT_OUTCOME_CHECKS_EVENT,
  schema: alertOutcomeChecksSchema,
};
