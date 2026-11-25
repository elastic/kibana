/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { SESSIONS_LOOKBACK_DAYS } from '../../../common/sessions';
import { describeError } from '../../lib/helpers/errors';
import { SESSIONS_PLATFORMS } from './sessions_platforms';
import { NULLIFY_UNMAPPED_FIELDS } from './summary_queries';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whether any platform has an event its summaries task would summarize, within the days sessions
 * are built from. A failed search, as when no source index exists yet, counts as none.
 */
export const hasSessionsSourceData = async (
  client: ElasticsearchClient,
  logger: Logger,
  now: number = Date.now()
): Promise<boolean> => {
  const params = [
    { data_from: new Date(now - SESSIONS_LOOKBACK_DAYS * DAY_MS).toISOString() },
    { data_to: new Date(now).toISOString() },
  ];
  try {
    const results = await Promise.all(
      SESSIONS_PLATFORMS.map(({ events }) =>
        client.esql.query({
          query: `${NULLIFY_UNMAPPED_FIELDS}
${events('data_from', 'data_to')}
| KEEP @timestamp
| LIMIT 1`,
          params,
        })
      )
    );
    return results.some(({ values }) => values.length > 0);
  } catch (error) {
    logger.debug(`Could not look for events to build sessions from: ${describeError(error)}`);
    return false;
  }
};
