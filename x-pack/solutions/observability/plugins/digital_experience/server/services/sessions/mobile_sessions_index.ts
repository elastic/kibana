/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import type { MobilePlatform } from '../../../common/otel_data';
import {
  MOBILE_SESSIONS_INDEX_PATTERN,
  MOBILE_SESSIONS_INDEX_TEMPLATE_NAME,
  MOBILE_SESSIONS_VERSION,
} from '../../../common/sessions';
import { count, keyword, sessionsMetaOf } from './sessions_index';

/** One mobile session's summary, as the mobile summaries task writes it. */
export interface MobileSessionDocument {
  session: { id: string };
  service: { name: string };
  /** Of the session's events; a crash's is when it happened, not when the next launch sent it. */
  start_time: string;
  end_time: string;
  duration_ms: number;
  event_count: number;
  /** `app.crash` events, which EDOT Android and EDOT iOS send on the next launch. */
  crash_count: number;
  /** EDOT iOS view controller spans; EDOT Android records no screens by default. */
  screen_view_count: number;
  /** `app.widget.click` events, which EDOT React Native records. */
  tap_count: number;
  /** HTTP requests the app made with a known outcome, and the failed ones. */
  http_request_count: number;
  http_failed_request_count: number;
  /** From the OS name, which both SDKs send. */
  platform: MobilePlatform | null;
  environment: string | null;
  user: { key: string | null };
  /** `installation_id` is a random id per install, so it counts users without an opt-in. */
  app: { version: string | null; build_id: string | null; installation_id: string | null };
  device: { model: string | null; manufacturer: string | null };
  os: { name: string | null; version: string | null };
  network: { connection_type: string | null };
  geo: { country_iso: string | null; region: string | null; city: string | null };
  /** Lowercased values a search matches anywhere in. */
  search: string[];
}

export const mobileSessionsIndexMappings = {
  dynamic: false,
  properties: {
    session: { properties: { id: keyword } },
    service: { properties: { name: keyword } },
    start_time: { type: 'date' },
    end_time: { type: 'date' },
    duration_ms: count,
    event_count: count,
    crash_count: count,
    screen_view_count: count,
    tap_count: count,
    http_request_count: count,
    http_failed_request_count: count,
    platform: keyword,
    environment: keyword,
    user: { properties: { key: keyword } },
    app: { properties: { version: keyword, build_id: keyword, installation_id: keyword } },
    device: { properties: { model: keyword, manufacturer: keyword } },
    os: { properties: { name: keyword, version: keyword } },
    network: { properties: { connection_type: keyword } },
    geo: { properties: { country_iso: keyword, region: keyword, city: keyword } },
    search: { type: 'wildcard' },
  },
} as const;

export const mobileSessionsIndexTemplate: IndicesPutIndexTemplateRequest = {
  name: MOBILE_SESSIONS_INDEX_TEMPLATE_NAME,
  index_patterns: [MOBILE_SESSIONS_INDEX_PATTERN],
  priority: 200,
  _meta: sessionsMetaOf(MOBILE_SESSIONS_VERSION),
  template: {
    settings: {
      'index.sort.field': ['start_time', 'session.id'],
      'index.sort.order': ['desc', 'asc'],
    },
    mappings: mobileSessionsIndexMappings,
  },
};
