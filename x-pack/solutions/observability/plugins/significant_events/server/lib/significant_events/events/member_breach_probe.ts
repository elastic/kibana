/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { QUERY_TYPE_MATCH, type QueryLink } from '@kbn/significant-events-schema';
import type { StatusOutcome } from './status_transition';

const PROBE_TIMEOUT_MS = 30_000;

const FROM_SOURCES = /^\s*FROM\s+([^|]+)/i;
const METADATA_TAIL = /\sMETADATA\s[\s\S]*$/i;

export interface ProbeWindow {
  from: string;
  to: string;
}

/** The stored query, capped to a single row — breach only needs to know whether any row matches. */
export const buildBreachQuery = (esql: string): string | undefined =>
  FROM_SOURCES.test(esql) ? `${esql.trimEnd()}\n| LIMIT 1` : undefined;

/**
 * Same sources as the stored query, no predicate: tells a rule that went quiet apart from a source
 * that has no data at all (a telemetry gap must not close an event).
 */
export const buildPresenceQuery = (esql: string): string | undefined => {
  const sources = FROM_SOURCES.exec(esql)?.[1].replace(METADATA_TAIL, '').trim();
  return sources ? `FROM ${sources} | LIMIT 1` : undefined;
};

const hasRows = async ({
  esClient,
  query,
  window,
  signal,
}: {
  esClient: ElasticsearchClient;
  query: string;
  window: ProbeWindow;
  signal?: AbortSignal;
}): Promise<boolean> => {
  const response = (await esClient.esql.query(
    {
      query,
      filter: { range: { '@timestamp': { gte: window.from, lt: window.to } } },
    },
    { signal, requestTimeout: PROBE_TIMEOUT_MS }
  )) as unknown as ESQLSearchResponse;
  return response.values.length > 0;
};

/**
 * Judges one member rule from its stored KI query over the window: `breaching` when the query
 * matches, `clean` when it does not but the source still has data, and `no_data` for everything
 * else — a query error, an empty source, or a query this probe cannot judge (stats-type queries
 * have no breach definition yet). Never throws: an unjudgeable member must hold the status, not
 * fail the whole evaluation.
 */
export const probeMemberOutcome = async ({
  esClient,
  link,
  window,
  logger,
  signal,
}: {
  esClient: ElasticsearchClient;
  link: QueryLink | undefined;
  window: ProbeWindow;
  logger: Logger;
  signal?: AbortSignal;
}): Promise<StatusOutcome> => {
  if (link === undefined || link.query.type !== QUERY_TYPE_MATCH) {
    return 'no_data';
  }

  const breachQuery = buildBreachQuery(link.query.esql.query);
  const presenceQuery = buildPresenceQuery(link.query.esql.query);
  if (breachQuery === undefined || presenceQuery === undefined) {
    return 'no_data';
  }

  try {
    if (await hasRows({ esClient, query: breachQuery, window, signal })) {
      return 'breaching';
    }
    return (await hasRows({ esClient, query: presenceQuery, window, signal }))
      ? 'clean'
      : 'no_data';
  } catch (error) {
    logger.debug(
      `Status probe for rule ${link.rule_id} could not be judged: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return 'no_data';
  }
};
