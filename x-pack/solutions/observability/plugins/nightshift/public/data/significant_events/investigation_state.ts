/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventInvestigationState } from '@kbn/significant-events-plugin/common';
import type { SignificantEvent } from '@kbn/significant-events-schema';

/** Same rule as the events route's `investigation_state` filter, so a row matches its filter. */
export const getInvestigationState = (
  event: Pick<SignificantEvent, 'investigations'>
): SignificantEventInvestigationState => {
  const investigations = event.investigations ?? [];
  if (investigations.length === 0) {
    return 'not_started';
  }
  return investigations.some(({ completed_at: completedAt }) => completedAt == null)
    ? 'in_progress'
    : 'completed';
};

/** Poll for five minutes beyond the investigation workflow's 60-minute timeout. */
export const hasInvestigationsToPoll = (
  events: Array<Pick<SignificantEvent, 'investigations'>>
): boolean => {
  const cutoff = Date.now() - 65 * 60 * 1000;
  return events.some(({ investigations }) =>
    investigations?.some(
      ({ completed_at: completedAt, started_at: startedAt }) =>
        completedAt == null && Date.parse(startedAt) > cutoff
    )
  );
};
