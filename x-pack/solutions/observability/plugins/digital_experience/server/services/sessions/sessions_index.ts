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
  SESSIONS_MANAGED_BY,
  SESSIONS_VERSION,
} from '../../../common/sessions';

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

/**
 * A browser can set a value of any length, and a keyword term over Lucene's 32 KB limit fails the
 * whole bulk request. A longer value stays in `_source` but is not indexed, so it drops out of
 * search and the facets instead of stalling every summary behind it.
 */
const MAX_KEYWORD_LENGTH = 1024;

const keyword = { type: 'keyword', ignore_above: MAX_KEYWORD_LENGTH } as const;
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
    environment: keyword,
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

/** Whether the sessions index of this version exists. */
export const sessionsIndexExists = async (
  client: ElasticsearchClient,
  signal?: AbortSignal
): Promise<boolean> => client.indices.exists({ index: SESSIONS_INDEX }, { signal });

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
