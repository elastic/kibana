/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryClient } from '@kbn/react-query';
import type { SignificantEventResponse } from '@kbn/significant-events-schema';
import { isRecentInvestigationStart } from './recent_investigation_start';

/** `unknown` means the lookup failed, not that there is no investigation. */
export type EventInvestigationState = NonNullable<SignificantEventResponse['investigation_state']>;

const RUNNING_INVESTIGATIONS_REFETCH_INTERVAL_MS = 5_000;

/** The investigation state the events list resolved for an event; an event it did not resolve reads `not_started`. */
export const getInvestigationState = (
  event: Pick<SignificantEventResponse, 'investigation_state'>
): EventInvestigationState => event.investigation_state ?? 'not_started';

/** Polls every 5s while an investigation runs or was just started here, and not otherwise. */
export const getInvestigationsRefetchInterval = (
  events: Array<Pick<SignificantEventResponse, 'investigation_state'>>,
  queryClient: QueryClient
): number | false => {
  const isRunning =
    isRecentInvestigationStart(queryClient) ||
    events.some((event) => getInvestigationState(event) === 'in_progress');
  return isRunning ? RUNNING_INVESTIGATIONS_REFETCH_INTERVAL_MS : false;
};
