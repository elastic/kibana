/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { withTimeout } from '@kbn/std';
import type { AgenticInvestigationsPluginStart } from '@kbn/agentic-investigations-plugin/server';
import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import {
  SEVERITY_OPTIONS,
  SIGNIFICANT_EVENTS_ALERT_SOURCE,
  type Severity,
} from '@kbn/significant-events-schema';
import type { RuleEventsClient } from '../rule_events_client';

/** What an investigation concluded for an event. Its severity is the one an event takes. */
interface InvestigationOutcome {
  severity: Severity;
}

/**
 * `unavailable` is the one accepted window of inexactness: callers fall back to the stored severity
 * and never write from it.
 */
export type InvestigationOutcomesResult =
  | { status: 'available'; outcomes: Map<string, InvestigationOutcome> }
  | {
      status: 'unavailable';
      reason: 'not_installed' | 'forbidden' | 'timeout' | 'error';
    };

export type InvestigationsReader = Pick<
  AgenticInvestigationsPluginStart,
  'getInvestigationsClient' | 'getSubjectsClient'
>;

type RecordedInvestigation = InvestigationSummary & {
  metadata: InvestigationSummary['metadata'] & { severity: Severity };
};

// These two limits mirror the agentic_investigations plugin (`MAX_SUBJECTS_PER_REQUEST` and
// `MAX_INVESTIGATIONS_PAGE_SIZE`); keep them in sync by hand.
const MAX_SUBJECT_KEYS_PER_READ = 50;
const MAX_IDS_PER_READ = 100;
const LOAD_TIMEOUT_MS = 10_000;

const isSeverity = (value: string | undefined): value is Severity =>
  SEVERITY_OPTIONS.some((severity) => severity === value);

const byNewestFirst = (left: InvestigationSummary, right: InvestigationSummary): number =>
  Date.parse(right.created_at) - Date.parse(left.created_at) || left.id.localeCompare(right.id);

/** The episodes (`alert.id` of an event's revisions) of its significant events alert subjects. */
const episodeIdsOf = ({ subjects }: InvestigationSummary): string[] =>
  subjects
    .filter(
      ({ type, snapshot }) =>
        type === 'alert' && snapshot?.source === SIGNIFICANT_EVENTS_ALERT_SOURCE
    )
    .map(({ id }) => id);

const isForbidden = (error: unknown): boolean =>
  error instanceof Error && error.name === 'InvestigationsForbiddenError';

/** An alert subject with no snapshot source never governs an event, so say so at debug. */
const logSubjectsWithoutSource = (investigations: InvestigationSummary[], logger: Logger) => {
  const count = investigations
    .flatMap(({ subjects }) => subjects)
    .filter(({ type, snapshot }) => type === 'alert' && !snapshot?.source).length;
  if (count) {
    logger.debug(`Investigation outcomes ignored ${count} alert subject(s) with no source`);
  }
};

/**
 * Runs a load under one timeout and turns every failure into an `unavailable` outcome. It logs at
 * debug: a page view calls it on every request, so the callers decide what is worth a warning.
 */
const settle = async ({
  load,
  logger,
  timeoutMs,
}: {
  load: () => Promise<InvestigationOutcomesResult>;
  logger: Logger;
  timeoutMs: number;
}): Promise<InvestigationOutcomesResult> => {
  try {
    const timed = await withTimeout({ promise: load(), timeoutMs });
    if (timed.timedout) {
      logger.debug('Investigation outcomes unavailable: reading the investigations timed out');
      return { status: 'unavailable', reason: 'timeout' };
    }
    return timed.value;
  } catch (error) {
    if (isForbidden(error)) {
      logger.debug('Investigation outcomes unavailable: the caller cannot read investigations');
      return { status: 'unavailable', reason: 'forbidden' };
    }
    logger.debug(
      `Investigation outcomes unavailable: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return { status: 'unavailable', reason: 'error' };
  }
};

export { episodeIdsOf, isForbidden };

/**
 * Investigations start at a placeholder `medium`; only the recorder's final pass writes the
 * severity, the verdict and the impact. Recorded means not in progress and all three present.
 */
export const isRecordedInvestigation = (
  investigation: InvestigationSummary
): investigation is RecordedInvestigation =>
  !investigation.in_progress &&
  isSeverity(investigation.metadata.severity) &&
  Boolean(investigation.metadata.verdict) &&
  Boolean(investigation.impact?.summary);

/**
 * The events of an investigation's episodes. An episode mapping to several events governs none and
 * is returned in `ambiguousEpisodeIds`.
 */
export const eventIdsGovernedBy = ({
  investigation,
  eventIdsByEpisode,
}: {
  investigation: InvestigationSummary;
  eventIdsByEpisode: ReadonlyMap<string, readonly string[]>;
}): { eventIds: Set<string>; ambiguousEpisodeIds: string[] } => {
  const eventIds = new Set<string>();
  const ambiguousEpisodeIds: string[] = [];
  episodeIdsOf(investigation).forEach((episodeId) => {
    const mapped = eventIdsByEpisode.get(episodeId) ?? [];
    if (mapped.length > 1) {
      ambiguousEpisodeIds.push(episodeId);
      return;
    }
    mapped.forEach((eventId) => eventIds.add(eventId));
  });
  return { eventIds, ambiguousEpisodeIds };
};

/**
 * Each event's outcome is that of its newest recorded investigation by `created_at` (`updated_at`
 * moves when an old one is closed), across all of its episodes.
 */
export const resolveInvestigationOutcomes = ({
  investigations,
  eventIdsByEpisode,
}: {
  investigations: InvestigationSummary[];
  eventIdsByEpisode: ReadonlyMap<string, readonly string[]>;
}): { outcomes: Map<string, InvestigationOutcome>; ambiguousEpisodeIds: string[] } => {
  const outcomes = new Map<string, InvestigationOutcome>();
  const ambiguousEpisodeIds = new Set<string>();

  investigations
    .filter(isRecordedInvestigation)
    .sort(byNewestFirst)
    .forEach((investigation) => {
      const governed = eventIdsGovernedBy({ investigation, eventIdsByEpisode });
      governed.ambiguousEpisodeIds.forEach((episodeId) => ambiguousEpisodeIds.add(episodeId));
      governed.eventIds.forEach((eventId) => {
        if (!outcomes.has(eventId))
          outcomes.set(eventId, { severity: investigation.metadata.severity });
      });
    });

  return { outcomes, ambiguousEpisodeIds: [...ambiguousEpisodeIds] };
};

/**
 * The outcome of the newest recorded investigation of each given event's episodes. Investigations
 * are found by key (the episodes' alert subjects) and read by id, so the cost follows the number of
 * events asked for, never the number of investigations.
 */
export const loadInvestigationOutcomes = async ({
  request,
  agenticInvestigations,
  eventClient,
  eventIds,
  logger,
  timeoutMs = LOAD_TIMEOUT_MS,
}: {
  request: KibanaRequest;
  agenticInvestigations: InvestigationsReader | undefined;
  eventClient: Pick<RuleEventsClient, 'findEpisodeIdsByEventIds'>;
  eventIds: string[];
  logger: Logger;
  timeoutMs?: number;
}): Promise<InvestigationOutcomesResult> => {
  if (!agenticInvestigations) return { status: 'unavailable', reason: 'not_installed' };
  if (!eventIds.length) return { status: 'available', outcomes: new Map() };

  return settle({
    logger,
    timeoutMs,
    load: async () => {
      const eventIdsByEpisode = new Map<string, string[]>();
      (await eventClient.findEpisodeIdsByEventIds(eventIds)).forEach((episodeIds, eventId) =>
        episodeIds.forEach((episodeId) => {
          const mapped = eventIdsByEpisode.get(episodeId);
          if (mapped) mapped.push(eventId);
          else eventIdsByEpisode.set(episodeId, [eventId]);
        })
      );

      const subjectsClient = agenticInvestigations.getSubjectsClient(request);
      const conversationIds = (
        await Promise.all(
          chunk([...eventIdsByEpisode.keys()], MAX_SUBJECT_KEYS_PER_READ).map((episodeIds) =>
            subjectsClient.findConversationIdsBySubjects(
              episodeIds.map((id) => ({ type: 'alert', id }))
            )
          )
        )
      ).flat();

      const client = agenticInvestigations.getInvestigationsClient(request);
      const investigations = (
        await Promise.all(
          chunk([...new Set(conversationIds)], MAX_IDS_PER_READ).map((ids) =>
            client.list({ id: ids, per_page: ids.length })
          )
        )
      ).flatMap(({ results }) => results);

      logSubjectsWithoutSource(investigations, logger);
      const { outcomes, ambiguousEpisodeIds } = resolveInvestigationOutcomes({
        investigations,
        eventIdsByEpisode,
      });
      if (ambiguousEpisodeIds.length) {
        logger.debug(
          `Investigation outcomes skipped ${ambiguousEpisodeIds.length} episode(s) that map to more than one event`
        );
      }
      // An investigation can also govern events outside the ones asked for.
      const wanted = new Set(eventIds);
      return {
        status: 'available',
        outcomes: new Map([...outcomes].filter(([eventId]) => wanted.has(eventId))),
      };
    },
  });
};
