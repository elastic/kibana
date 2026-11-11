/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import { CORE_WEB_VITALS } from '../../common/core_web_vitals';
import {
  SESSIONS_INDEX_PATTERN,
  SESSIONS_INDEX_TEMPLATE_NAME,
  SESSIONS_MANAGED_BY,
  SESSIONS_VERSION,
} from '../../common/sessions';

// `managed` makes the Index Management UI warn before editing or deleting these.
const SESSIONS_META = { managed: true, managed_by: SESSIONS_MANAGED_BY, version: SESSIONS_VERSION };

export const sessionsIndexMappings = {
  dynamic: false,
  properties: {
    session: { properties: { id: { type: 'keyword' } } },
    service: { properties: { name: { type: 'keyword' } } },
    start_time: { type: 'date' },
    end_time: { type: 'date' },
    duration_ms: { type: 'long' },
    event_count: { type: 'long' },
    page_view_count: { type: 'long' },
    // Page loads (`browser.navigation_timing`), JS errors (`exception`) and HTTP requests count
    // what the applications list counts, which differs from the page views and errors above.
    page_load_count: { type: 'long' },
    js_error_count: { type: 'long' },
    http_request_count: { type: 'long' },
    http_failed_request_count: { type: 'long' },
    click_count: { type: 'long' },
    error_count: { type: 'long' },
    bounced: { type: 'boolean' },
    has_error: { type: 'boolean' },
    entry_page: { type: 'keyword' },
    exit_page: { type: 'keyword' },
    journey: { type: 'keyword' },
    // Set by the browser, so bounded like the environments the routes accept.
    environment: { type: 'keyword', ignore_above: 1024 },
    error: { properties: { message: { type: 'keyword', ignore_above: 1024 } } },
    user: { properties: { key: { type: 'keyword' } } },
    user_agent: {
      properties: {
        browser: { type: 'keyword' },
        browser_version: { type: 'keyword' },
        os: { type: 'keyword' },
        device: { type: 'keyword' },
      },
    },
    geo: {
      properties: {
        country_iso: { type: 'keyword' },
        region: { type: 'keyword' },
        city: { type: 'keyword' },
      },
    },
    // The p75 of each vital's samples in the session.
    web_vitals: {
      properties: Object.fromEntries(
        CORE_WEB_VITALS.map((name) => [name, { type: 'double' as const }])
      ),
    },
    // The samples of each vital and how many are good, need improvement or are poor, which add up
    // across sessions, unlike the p75.
    web_vital_samples: {
      properties: Object.fromEntries(
        CORE_WEB_VITALS.map((name) => [
          name,
          {
            properties: {
              count: { type: 'long' as const },
              good: { type: 'long' as const },
              needs_improvement: { type: 'long' as const },
              poor: { type: 'long' as const },
            },
          },
        ])
      ),
    },
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
