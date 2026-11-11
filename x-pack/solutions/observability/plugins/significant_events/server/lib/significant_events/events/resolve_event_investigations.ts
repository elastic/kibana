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

// The three limits below mirror the agentic_investigations plugin
// (`common/investigations/constants.ts` and its subjects request limit); keep them in sync by hand.
const MAX_SUBJECT_KEYS_PER_READ = 50; // MAX_SUBJECTS_PER_REQUEST
const MAX_IDS_PER_READ = 100; // MAX_INVESTIGATIONS_PAGE_SIZE
const READ_CONCURRENCY = 3;
const READ_TIMEOUT_MS = 5_000;
/** The whole listing, not one page: a slow Investigations plugin must not hold a request for 10 pages. */
const LIST_DEADLINE_MS = 10_000;
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
  const byEpisode = new Map<string, InvestigationSummary>();
  let loaded = 0;
  let total = 0;

  const deadline = Date.now() + LIST_DEADLINE_MS;

  try {
    for (let page = 1; (page - 1) * LIST_PAGE_SIZE < MAX_LISTED_INVESTIGATIONS; page++) {
      const timeoutMs = Math.min(READ_TIMEOUT_MS, deadline - Date.now());
      if (timeoutMs <= 0) throw new Error(`Listing took longer than ${LIST_DEADLINE_MS}ms`);
      const outcome = await withTimeout({
        promise: client.list({
          subject_type: ALERT_SUBJECT_TYPE,
          // Creation time never changes, so a running investigation cannot move between pages
          // while the pages are read one after another.
          sort_field: 'created_at',
          sort_order: 'desc',
          page,
          per_page: LIST_PAGE_SIZE,
        }),
        timeoutMs,
      });
      if (outcome.timedout) throw new Error(`Timed out after ${timeoutMs}ms`);
      const response = outcome.value;
      total = response.pagination.total;
      loaded += response.results.length;
      for (const summary of response.results) {
        for (const episodeId of getAlertSubjectIds(summary)) {
          const current = byEpisode.get(episodeId);
          // Same rule as the per-event resolver, so a row, the filter and the facets agree.
          byEpisode.set(
            episodeId,
            current ? pickInvestigation([current, summary]) ?? summary : summary
          );
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
  for (const [episodeId, summary] of byEpisode) {
    (toState(summary) === 'in_progress' ? inProgress : completed).push(episodeId);
  }
  // The investigations client caps `total` at the listing cap, so reaching the cap also means truncated.
  return {
    inProgress,
    completed,
    truncated: total > loaded || loaded >= MAX_LISTED_INVESTIGATIONS,
  };
};
