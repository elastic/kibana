/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import { CORE_WEB_VITALS, type CoreWebVital } from '../../../common/core_web_vitals';
import {
  SESSIONS_INDEX,
  SESSIONS_INDEX_PATTERN,
  SESSIONS_INDEX_TEMPLATE_NAME,
  SESSIONS_LOOKBACK_DAYS,
  SESSIONS_MANAGED_BY,
  SESSIONS_VERSION,
} from '../../../common/sessions';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Deleting the expired summaries waits this long, inside the summaries task's 5 minutes. */
const RETENTION_TIMEOUT_MS = 2 * 60 * 1000;

/** Names a sessions index of a given version, so another index of the pattern is never deleted. */
const SESSIONS_INDEX_NAME = /^digital-experience-sessions-(\d+)$/;

// `managed` makes the Index Management UI warn before editing or deleting these.
export const SESSIONS_META = {
  managed: true,
  managed_by: SESSIONS_MANAGED_BY,
  version: SESSIONS_VERSION,
};

export interface WebVitalSamples {
  count: number;
  good: number;
  needs_improvement: number;
  poor: number;
}

/** One session's summary, as the summaries task writes it. */
export interface SessionDocument {
  session: { id: string };
  service: { name: string };
  start_time: string;
  end_time: string;
  duration_ms: number;
  event_count: number;
  /** Page loads and in-app navigations (`documentLoad`, `browser.navigation`). */
  page_view_count: number;
  /** Full page loads (`browser.navigation_timing`), as the applications list counts them. */
  page_load_count: number;
  click_count: number;
  /** `exception` events, as the applications list counts JS errors. */
  js_error_count: number;
  /** HTTP requests the browser made with a known outcome, and the failed ones. */
  http_request_count: number;
  http_failed_request_count: number;
  bounced: boolean;
  entry_page: string | null;
  exit_page: string | null;
  journey: string[];
  environment: string | null;
  user: { key: string | null };
  user_agent: {
    browser: string | null;
    browser_version: string | null;
    os: string | null;
    device: string | null;
  };
  geo: { country_iso: string | null; region: string | null; city: string | null };
  /** The p75 of each vital's samples in the session. */
  web_vitals: Record<CoreWebVital, number | null>;
  /** The samples of each vital by rating, which add up across sessions, unlike the p75. */
  web_vital_samples: Record<CoreWebVital, WebVitalSamples>;
  /** Lowercased values the list's search matches anywhere in. */
  search: string[];
}

const keyword = { type: 'keyword' } as const;
const count = { type: 'long' } as const;

export const sessionsIndexMappings = {
  dynamic: false,
  properties: {
    session: { properties: { id: keyword } },
    service: { properties: { name: keyword } },
    start_time: { type: 'date' },
    end_time: { type: 'date' },
    duration_ms: count,
    event_count: count,
    page_view_count: count,
    page_load_count: count,
    click_count: count,
    js_error_count: count,
    http_request_count: count,
    http_failed_request_count: count,
    bounced: { type: 'boolean' },
    entry_page: keyword,
    exit_page: keyword,
    journey: keyword,
    // Set by the browser, so bounded like the environments the routes accept.
    environment: { type: 'keyword', ignore_above: 1024 },
    user: { properties: { key: keyword } },
    user_agent: {
      properties: { browser: keyword, browser_version: keyword, os: keyword, device: keyword },
    },
    geo: { properties: { country_iso: keyword, region: keyword, city: keyword } },
    web_vitals: {
      properties: Object.fromEntries(
        CORE_WEB_VITALS.map((name) => [name, { type: 'double' as const }])
      ),
    },
    web_vital_samples: {
      properties: Object.fromEntries(
        CORE_WEB_VITALS.map((name) => [
          name,
          { properties: { count, good: count, needs_improvement: count, poor: count } },
        ])
      ),
    },
    // `wildcard` finds a term anywhere in a value without scanning every keyword term.
    search: { type: 'wildcard' },
  },
} as const;

export const sessionsIndexTemplate: IndicesPutIndexTemplateRequest = {
  name: SESSIONS_INDEX_TEMPLATE_NAME,
  index_patterns: [SESSIONS_INDEX_PATTERN],
  priority: 200,
  _meta: SESSIONS_META,
  template: {
    settings: {
      'index.sort.field': ['start_time', 'session.id'],
      'index.sort.order': ['desc', 'asc'],
    },
    mappings: sessionsIndexMappings,
  },
};

/** Puts the index template. Kibana's internal user owns it, as no user needs to manage templates. */
export const putSessionsIndexTemplate = async (
  internalClient: ElasticsearchClient,
  signal?: AbortSignal
): Promise<void> => {
  await internalClient.indices.putIndexTemplate(sessionsIndexTemplate, { signal });
};

/** Creates the sessions index of this version unless it exists; true when it was created. */
export const createSessionsIndex = async (
  client: ElasticsearchClient,
  signal?: AbortSignal
): Promise<boolean> => {
  try {
    await client.indices.create({ index: SESSIONS_INDEX }, { signal });
    return true;
  } catch (error) {
    if (isResponseError(error) && error.body?.error?.type === 'resource_already_exists_exception') {
      return false;
    }
    throw error;
  }
};

/**
 * Deletes the sessions indices of older versions, by name, as Elasticsearch refuses wildcard
 * deletes by default. Readers search every version, so an older one would count sessions twice.
 * A newer version's index is left alone: during a rolling upgrade, or a rollback, a node of this
 * version runs beside one that writes it.
 */
export const deleteOlderSessionsIndices = async (
  client: ElasticsearchClient,
  signal?: AbortSignal
): Promise<string[]> => {
  const indices = await client.indices.get(
    { index: SESSIONS_INDEX_PATTERN, allow_no_indices: true, expand_wildcards: ['open', 'closed'] },
    { signal }
  );
  const older = Object.keys(indices).filter((name) => {
    const version = SESSIONS_INDEX_NAME.exec(name)?.[1];
    return version !== undefined && Number(version) < SESSIONS_VERSION;
  });
  if (older.length > 0) {
    await client.indices.delete({ index: older, ignore_unavailable: true }, { signal });
  }
  return older;
};

/**
 * Deletes the summaries of sessions that ended before the lookback, plus a day of margin: they no
 * longer get events, and the list never reads that far back. Waits for the deletion and throws
 * what failed, rather than leaving a task document behind that nothing reads or deletes.
 */
export const deleteExpiredSessions = async (
  client: ElasticsearchClient,
  now: number,
  signal?: AbortSignal
): Promise<number> => {
  const cutoff = now - (SESSIONS_LOOKBACK_DAYS + 1) * DAY_MS;
  const response = await client.deleteByQuery(
    {
      index: SESSIONS_INDEX,
      ignore_unavailable: true,
      conflicts: 'proceed',
      query: { range: { end_time: { lt: new Date(cutoff).toISOString() } } },
    },
    // A run summarizes for at most 45 seconds, so this still ends well before the task's timeout.
    { signal, requestTimeout: RETENTION_TIMEOUT_MS }
  );
  const failures = response.failures ?? [];
  if (failures.length > 0) {
    const { cause } = failures[0];
    const reason = cause?.reason ?? cause?.type ?? 'an unknown error';
    throw new Error(`${reason} (${failures.length} failed)`);
  }
  return response.deleted ?? 0;
};
