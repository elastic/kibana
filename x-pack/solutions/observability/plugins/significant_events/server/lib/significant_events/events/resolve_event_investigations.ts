/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import type { AgenticInvestigationsPluginStart } from '@kbn/agentic-investigations-plugin/server';
import type { SignificantEventResponse } from '@kbn/significant-events-schema';
import { chunk } from 'lodash';
import pLimit from 'p-limit';
import { withTimeout } from '@kbn/std';
import type { InvestigationEpisodes } from './types';

/** `unknown` means the lookup failed, not that no investigation exists. */
export type EventInvestigationState = NonNullable<SignificantEventResponse['investigation_state']>;

export interface EventInvestigation {
  state: EventInvestigationState;
  investigationId?: string;
}

export type InvestigationsReader = Pick<
  AgenticInvestigationsPluginStart,
  'getInvestigationsClient' | 'getSubjectsClient'
>;

const MAX_SUBJECT_KEYS_PER_READ = 50; // MAX_SUBJECTS_PER_REQUEST
const MAX_IDS_PER_READ = 100; // MAX_INVESTIGATIONS_PAGE_SIZE
const READ_CONCURRENCY = 3;
const READ_TIMEOUT_MS = 5_000;
const MAX_LISTED_INVESTIGATIONS = 1_000; // MAX_INVESTIGATION_CANDIDATES
const LIST_PAGE_SIZE = 100;

const ALERT_SUBJECT_TYPE = 'alert';

const getAlertSubjectIds = ({ subjects }: InvestigationSummary): string[] =>
  subjects.flatMap(({ type, id }) => (type === ALERT_SUBJECT_TYPE ? [id] : []));

const isOpen = ({ metadata }: InvestigationSummary): boolean => metadata.status === 'open';

const toState = ({ in_progress: inProgress }: InvestigationSummary): 'in_progress' | 'completed' =>
  inProgress ? 'in_progress' : 'completed';

const pickInvestigation = (candidates: InvestigationSummary[]): InvestigationSummary | undefined =>
  [...candidates].sort((left, right) => {
    if (isOpen(left) !== isOpen(right)) return isOpen(left) ? -1 : 1;
    return Date.parse(right.updated_at) - Date.parse(left.updated_at);
  })[0];

/** Resolves each episode's investigation (the open one, else the newest) through its alert subject. */
export const resolveEventInvestigations = async ({
  agenticInvestigations,
  request,
  episodeIds,
  logger,
}: {
  agenticInvestigations?: InvestigationsReader;
  request: KibanaRequest;
  episodeIds: Array<string | undefined>;
  logger: Logger;
}): Promise<Map<string, EventInvestigation>> => {
  const uniqueIds = [...new Set(episodeIds.filter((id): id is string => Boolean(id)))];
  const resolved = new Map<string, EventInvestigation>();

  if (!agenticInvestigations) {
    logger.debug('Agentic investigations not available, cannot resolve event investigations');
    uniqueIds.forEach((id) => resolved.set(id, { state: 'unknown' }));
    return resolved;
  }

  const subjectsClient = agenticInvestigations.getSubjectsClient(request);
  const investigationsClient = agenticInvestigations.getInvestigationsClient(request);

  const readSummaries = async (episodes: string[]): Promise<InvestigationSummary[]> => {
    const conversationIds = await subjectsClient.findConversationIdsBySubjects(
      episodes.map((id) => ({ type: ALERT_SUBJECT_TYPE, id }))
    );
    const pages = await Promise.all(
      chunk([...new Set(conversationIds)], MAX_IDS_PER_READ).map((ids) =>
        investigationsClient.list({ id: ids, per_page: ids.length })
      )
    );
    return pages.flatMap(({ results }) => results);
  };

  const resolveChunk = async (episodes: string[]): Promise<void> => {
    try {
      const outcome = await withTimeout({
        promise: readSummaries(episodes),
        timeoutMs: READ_TIMEOUT_MS,
      });
      if (outcome.timedout) throw new Error(`Timed out after ${READ_TIMEOUT_MS}ms`);
      for (const episodeId of episodes) {
        const best = pickInvestigation(
          outcome.value.filter((summary) => getAlertSubjectIds(summary).includes(episodeId))
        );
        resolved.set(
          episodeId,
          best ? { state: toState(best), investigationId: best.id } : { state: 'not_started' }
        );
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      logger.debug(`Could not resolve event investigations: ${reason}`);
      episodes.forEach((id) => resolved.set(id, { state: 'unknown' }));
    }
  };

  const limit = pLimit(READ_CONCURRENCY);
  await Promise.all(
    chunk(uniqueIds, MAX_SUBJECT_KEYS_PER_READ).map((episodes) =>
      limit(() => resolveChunk(episodes))
    )
  );
  return resolved;
};

export interface InvestigationStateSets extends InvestigationEpisodes {
  /** The listing reached its cap, so episodes with older investigations read `not_started`. */
  truncated: boolean;
}

/** The episodes with a running investigation and the ones without, from the newest alert-subject investigations. */
export const listInvestigationStateSets = async ({
  agenticInvestigations,
  request,
  logger,
}: {
  agenticInvestigations?: Pick<AgenticInvestigationsPluginStart, 'getInvestigationsClient'>;
  request: KibanaRequest;
  logger: Logger;
}): Promise<InvestigationStateSets | 'unavailable'> => {
  if (!agenticInvestigations) {
    logger.debug('Agentic investigations not available, cannot list investigation states');
    return 'unavailable';
  }

  const client = agenticInvestigations.getInvestigationsClient(request);
  const byEpisode = new Map<string, { open: boolean; state: 'in_progress' | 'completed' }>();
  let loaded = 0;
  let total = 0;

  try {
    for (let page = 1; (page - 1) * LIST_PAGE_SIZE < MAX_LISTED_INVESTIGATIONS; page++) {
      const outcome = await withTimeout({
        promise: client.list({
          subject_type: ALERT_SUBJECT_TYPE,
          sort_field: 'updated_at',
          sort_order: 'desc',
          page,
          per_page: LIST_PAGE_SIZE,
        }),
        timeoutMs: READ_TIMEOUT_MS,
      });
      if (outcome.timedout) throw new Error(`Timed out after ${READ_TIMEOUT_MS}ms`);
      const response = outcome.value;
      total = response.pagination.total;
      loaded += response.results.length;
      for (const summary of response.results) {
        const open = isOpen(summary);
        for (const episodeId of getAlertSubjectIds(summary)) {
          const current = byEpisode.get(episodeId);
          // Newest first: an episode keeps its newest investigation unless an open one follows.
          if (!current || (!current.open && open)) {
            byEpisode.set(episodeId, { open, state: toState(summary) });
          }
        }
      }
      if (response.results.length < LIST_PAGE_SIZE || loaded >= total) break;
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.debug(`Could not list investigation states: ${reason}`);
    return 'unavailable';
  }

  const inProgress: string[] = [];
  const completed: string[] = [];
  for (const [episodeId, { state }] of byEpisode) {
    (state === 'in_progress' ? inProgress : completed).push(episodeId);
  }
  return { inProgress, completed, truncated: total > loaded };
};
