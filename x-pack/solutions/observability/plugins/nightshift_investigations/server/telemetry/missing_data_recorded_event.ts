/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts, RootSchema } from '@kbn/core/server';

export const NIGHTSHIFT_MISSING_DATA_RECORDED_EVENT = 'nightshift-missing-data-recorded';

/** Why the data was missing, or `unspecified` when the recorder gave no reason. */
export type MissingDataRecordedReason =
  | 'no_access'
  | 'not_retained'
  | 'not_collected'
  | 'not_queried'
  | 'unspecified';

/** One event per gap an investigation recorded. It carries no text of the gap itself. */
export interface MissingDataRecordedEvent {
  reason: MissingDataRecordedReason;
}

const missingDataRecordedSchema: RootSchema<MissingDataRecordedEvent> = {
  reason: {
    type: 'keyword',
    _meta: {
      description:
        'Why data was missing when the cause stayed unconfirmed: no_access, not_retained, not_collected, not_queried or unspecified.',
    },
  },
};

export const missingDataRecordedEvent: EventTypeOpts<MissingDataRecordedEvent> = {
  eventType: NIGHTSHIFT_MISSING_DATA_RECORDED_EVENT,
  schema: missingDataRecordedSchema,
};
