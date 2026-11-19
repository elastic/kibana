/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsMaxAggregate } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { ANALYTICS_SAMPLE_EVENTS_INDEX } from '../../common/analytics_sample_events';
import type {
  AnalyticsSampleEventsInstallResult,
  AnalyticsSampleEventsRemoveResult,
} from '../../common/analytics_sample_events';
import { SAMPLE_EVENTS_MAPPINGS, generateSampleEvents } from './analytics_sample_events_generator';
import type { SampleEvent } from './analytics_sample_events_generator';

const BULK_CHUNK_SIZE = 2500;
/** Installed events older than this are regenerated so that recent time ranges are never empty. */
export const SAMPLE_EVENTS_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Thrown when the install cannot complete; carries the HTTP status the route answers with. */
export class SampleEventsInstallError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = 'SampleEventsInstallError';
  }
}

interface ElasticsearchError {
  statusCode?: number;
  message: string;
  body?: { error?: { type?: string } };
}

const isNotFound = ({ statusCode }: ElasticsearchError): boolean => statusCode === 404;

interface InstalledEvents {
  count: number;
  latestEventTime: number | null;
}

/** What the index holds now, or null when it does not exist. */
const readInstalledEvents = async (
  client: IScopedClusterClient
): Promise<InstalledEvents | null> => {
  try {
    const { hits, aggregations } = await client.asCurrentUser.search<
      never,
      { latest: AggregationsMaxAggregate }
    >({
      index: ANALYTICS_SAMPLE_EVENTS_INDEX,
      size: 0,
      track_total_hits: true,
      aggs: { latest: { max: { field: '@timestamp' } } },
    });

    return {
      count: typeof hits.total === 'number' ? hits.total : hits.total?.value ?? 0,
      latestEventTime: aggregations?.latest.value ?? null,
    };
  } catch (error) {
    if (isNotFound(error)) {
      return null;
    }
    throw error;
  }
};

/** Resolves whether there was an index to delete. */
const deleteIndex = async (client: IScopedClusterClient): Promise<boolean> => {
  try {
    await client.asCurrentUser.indices.delete({ index: ANALYTICS_SAMPLE_EVENTS_INDEX });
    return true;
  } catch (error) {
    if (isNotFound(error)) {
      return false;
    }
    throw error;
  }
};

const createIndex = async (client: IScopedClusterClient): Promise<void> => {
  try {
    await client.asCurrentUser.indices.create({
      index: ANALYTICS_SAMPLE_EVENTS_INDEX,
      settings: { index: { number_of_shards: 1, auto_expand_replicas: '0-1' } },
      mappings: SAMPLE_EVENTS_MAPPINGS,
    });
  } catch (error) {
    const { body }: ElasticsearchError = error;
    if (body?.error?.type === 'resource_already_exists_exception') {
      throw new SampleEventsInstallError(
        'The sample events are being installed by another request',
        409
      );
    }
    throw error;
  }
};

const indexEvents = async (
  client: IScopedClusterClient,
  events: readonly SampleEvent[]
): Promise<void> => {
  for (let start = 0; start < events.length; start += BULK_CHUNK_SIZE) {
    const chunk = events.slice(start, start + BULK_CHUNK_SIZE);
    const isLastChunk = start + BULK_CHUNK_SIZE >= events.length;
    const { errors, items } = await client.asCurrentUser.bulk({
      index: ANALYTICS_SAMPLE_EVENTS_INDEX,
      // Searchable as soon as the install answers, so the pages can count the events right away.
      refresh: isLastChunk,
      // The position is the id, which keeps a repeated write from duplicating an event.
      operations: chunk.flatMap((event, offset) => [
        { index: { _id: String(start + offset) } },
        event,
      ]),
    });

    if (errors) {
      const failures = items.flatMap(({ index }) => (index?.error ? [index] : []));
      const [firstFailure] = failures;
      throw new SampleEventsInstallError(
        `${failures.length} of ${chunk.length} sample events were rejected: ${
          firstFailure?.error?.reason ?? firstFailure?.error?.type ?? 'no reason given'
        }`,
        firstFailure?.status === 403 ? 403 : 500
      );
    }
  }
};

export interface SampleEventsParams {
  client: IScopedClusterClient;
  logger: Logger;
}

/**
 * Creates the sample events index as the caller and fills it with a generated week of events that
 * ends at `now`. Complete, recent events are left untouched; incomplete or outdated ones are
 * replaced. A failed install removes what it created, so the index is never left half filled.
 */
export const installSampleEvents = async ({
  client,
  logger,
  now = Date.now(),
}: SampleEventsParams & { now?: number }): Promise<AnalyticsSampleEventsInstallResult> => {
  const events = generateSampleEvents({ now });
  const installed = await readInstalledEvents(client);

  if (
    installed !== null &&
    installed.count === events.length &&
    installed.latestEventTime !== null &&
    installed.latestEventTime >= now - SAMPLE_EVENTS_MAX_AGE_MS
  ) {
    return {
      index: ANALYTICS_SAMPLE_EVENTS_INDEX,
      eventsCount: installed.count,
      status: 'alreadyInstalled',
    };
  }

  const isReplacing = installed !== null && (await deleteIndex(client));
  await createIndex(client);

  try {
    await indexEvents(client, events);
  } catch (error) {
    try {
      await deleteIndex(client);
    } catch (cleanupError) {
      logger.warn(
        `Failed to remove the partially installed sample events from ${ANALYTICS_SAMPLE_EVENTS_INDEX}: ${cleanupError.message}`
      );
    }
    throw error;
  }

  return {
    index: ANALYTICS_SAMPLE_EVENTS_INDEX,
    eventsCount: events.length,
    status: isReplacing ? 'replaced' : 'installed',
  };
};

/** Deletes the sample events index as the caller; a missing index is not an error. */
export const removeSampleEvents = async ({
  client,
}: Pick<SampleEventsParams, 'client'>): Promise<AnalyticsSampleEventsRemoveResult> => ({
  index: ANALYTICS_SAMPLE_EVENTS_INDEX,
  status: (await deleteIndex(client)) ? 'removed' : 'notInstalled',
});
