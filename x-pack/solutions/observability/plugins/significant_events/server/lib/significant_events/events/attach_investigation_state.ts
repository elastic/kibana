/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serverUnavailable } from '@hapi/boom';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { SignificantEventResponse } from '@kbn/significant-events-schema';
import type { SignificantEventInvestigationState } from '../../../../common/events_list';
import {
  resolveEventInvestigations,
  type EventInvestigationState,
  type InvestigationsReader,
  type InvestigationStateSets,
} from './resolve_event_investigations';
import type { EventsFilterOptions, InvestigationEpisodes } from './types';

export const toEpisodes = ({
  inProgress,
  completed,
}: InvestigationStateSets): InvestigationEpisodes => ({
  inProgress,
  completed,
});

export const toInvestigationFilter = (
  states: SignificantEventInvestigationState[] | undefined,
  sets: InvestigationStateSets | undefined
): EventsFilterOptions['investigation'] =>
  states?.length && sets ? { states, episodes: toEpisodes(sets) } : undefined;

export const createInvestigationStateUnavailableError = () =>
  serverUnavailable(
    'The investigation state is unavailable, so events cannot be filtered by it. Check that Agentic Investigations is available and that you can read investigations.'
  );

/**
 * Gives each event its investigation state: from `sets` when the list is filtered, else resolved
 * per event. Only the unfiltered path knows the investigation id, so a filtered row carries none.
 */
export const attachInvestigationState = async ({
  hits,
  sets,
  agenticInvestigations,
  request,
  logger,
}: {
  hits: SignificantEventResponse[];
  sets?: InvestigationStateSets;
  agenticInvestigations?: InvestigationsReader;
  request: KibanaRequest;
  logger: Logger;
}): Promise<SignificantEventResponse[]> => {
  if (sets) {
    const inProgress = new Set(sets.inProgress);
    const completed = new Set(sets.completed);
    const stateOf = (episodeId?: string): EventInvestigationState => {
      if (episodeId && inProgress.has(episodeId)) return 'in_progress';
      if (episodeId && completed.has(episodeId)) return 'completed';
      return 'not_started';
    };
    return hits.map((hit) => ({ ...hit, investigation_state: stateOf(hit.episode_id) }));
  }

  const resolved = await resolveEventInvestigations({
    agenticInvestigations,
    request,
    episodeIds: hits.map(({ episode_id: episodeId }) => episodeId),
    logger,
  });
  return hits.map((hit) => {
    const found = hit.episode_id ? resolved.get(hit.episode_id) : undefined;
    return {
      ...hit,
      investigation_state: found?.state ?? 'not_started',
      ...(found?.investigationId ? { investigation_id: found.investigationId } : {}),
    };
  });
};
