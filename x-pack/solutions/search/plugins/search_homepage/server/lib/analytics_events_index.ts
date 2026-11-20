/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesIndexSettings } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';
import { EVENTS_INDEX_MODE } from '../../common/analytics_events_index';
import type { AnalyticsEventsIndexCreateResult } from '../../common/analytics_events_index';

export const EVENTS_INDEX_TIME_FIELD = '@timestamp';

/**
 * Index settings for events: columnar mode, which has no index sort of its own, sorted newest
 * first because every event query is bounded by time and the other fields are not known up front.
 */
export const getEventsIndexSettings = (): IndicesIndexSettings => ({
  mode: EVENTS_INDEX_MODE,
  sort: { field: [EVENTS_INDEX_TIME_FIELD], order: ['desc'] },
});

/** Thrown when the index cannot be created; carries the HTTP status the route answers with. */
export class EventsIndexCreateError extends Error {
  constructor(message: string, public readonly statusCode: 400 | 409) {
    super(message);
    this.name = 'EventsIndexCreateError';
  }
}

interface ElasticsearchError {
  body?: { error?: { type?: string; reason?: string } };
}

/** Creates an empty index for events as the caller; every field but the time field is mapped as it arrives. */
export const createEventsIndex = async ({
  client,
  name,
}: {
  client: IScopedClusterClient;
  name: string;
}): Promise<AnalyticsEventsIndexCreateResult> => {
  try {
    const { index } = await client.asCurrentUser.indices.create({
      index: name,
      settings: { index: getEventsIndexSettings() },
      mappings: { properties: { [EVENTS_INDEX_TIME_FIELD]: { type: 'date' } } },
    });

    return { index };
  } catch (error) {
    const { body }: ElasticsearchError = error;
    const type = body?.error?.type;
    if (type === 'resource_already_exists_exception') {
      throw new EventsIndexCreateError(`An index named ${name} already exists`, 409);
    }
    if (type === 'invalid_index_name_exception') {
      throw new EventsIndexCreateError(
        body?.error?.reason ?? `${name} is not a valid index name`,
        400
      );
    }
    throw error;
  }
};
