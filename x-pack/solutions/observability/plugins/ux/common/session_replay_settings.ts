/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidEsTimeValue, RUM_SESSIONS_SYNC_DELAY } from './rum_sessions';
import { parseGroupingRules, parseIgnoreUrls, type UrlGroupingConfig } from './url_grouping';

/**
 * Runtime configuration for auto-injecting the EDOT browser SDK into Kibana.
 * Persisted as a single saved object so it can be changed from the settings UI
 * without rebuilding or redeploying Kibana.
 */
export interface SessionReplaySettings {
  enabled: boolean;
  otlpEndpoint: string;
  serviceName: string;
  sampleRate: number;
  ignoreUrls: string;
  urlGroupingDepth: number;
  urlGroupingRules: string;
  maskTextSelector: string;
  captureGraphql: boolean;
  /** Elasticsearch time value applied to session and daily transforms (`5m`, `30s`, `1h`). */
  syncDelay: string;
}

export const SESSION_REPLAY_SETTINGS_SO_TYPE = 'ux-session-replay-settings';

/** Single well-known document id — there is one settings object per deployment. */
export const SESSION_REPLAY_SETTINGS_SO_ID = 'session-replay-settings';

export const SESSION_REPLAY_SETTINGS_API = '/internal/ux/session_replay/settings';

export const OTLP_ENDPOINT_MAX_LENGTH = 2048;
export const SERVICE_NAME_MAX_LENGTH = 256;
export const IGNORE_URLS_MAX_LENGTH = 4096;
export const URL_GROUPING_RULES_MAX_LENGTH = 2048;
export const MASK_TEXT_SELECTOR_MAX_LENGTH = 512;
export const URL_GROUPING_DEPTH_MIN = 1;
export const URL_GROUPING_DEPTH_MAX = 8;
export const SYNC_DELAY_MAX_LENGTH = 8;

export const DEFAULT_SESSION_REPLAY_SETTINGS: SessionReplaySettings = {
  enabled: false,
  otlpEndpoint: '',
  serviceName: 'kibana',
  sampleRate: 100,
  ignoreUrls: '',
  urlGroupingDepth: 3,
  urlGroupingRules: '',
  maskTextSelector: '',
  captureGraphql: false,
  syncDelay: RUM_SESSIONS_SYNC_DELAY,
};

const clampDepth = (value: unknown): number => {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) {
    return DEFAULT_SESSION_REPLAY_SETTINGS.urlGroupingDepth;
  }
  return Math.min(URL_GROUPING_DEPTH_MAX, Math.max(URL_GROUPING_DEPTH_MIN, n));
};

/** Clamp/trim untrusted input to the persisted bounds. */
export const normalizeSessionReplaySettings = (
  input: Partial<SessionReplaySettings>
): SessionReplaySettings => ({
  enabled: Boolean(input.enabled),
  otlpEndpoint: String(input.otlpEndpoint ?? '').slice(0, OTLP_ENDPOINT_MAX_LENGTH),
  serviceName:
    String(input.serviceName ?? '').slice(0, SERVICE_NAME_MAX_LENGTH) ||
    DEFAULT_SESSION_REPLAY_SETTINGS.serviceName,
  sampleRate: Math.min(100, Math.max(0, Math.round(Number(input.sampleRate) || 0))),
  ignoreUrls: String(input.ignoreUrls ?? '').slice(0, IGNORE_URLS_MAX_LENGTH),
  urlGroupingDepth: clampDepth(input.urlGroupingDepth),
  urlGroupingRules: String(input.urlGroupingRules ?? '').slice(0, URL_GROUPING_RULES_MAX_LENGTH),
  maskTextSelector: String(input.maskTextSelector ?? '').slice(0, MASK_TEXT_SELECTOR_MAX_LENGTH),
  captureGraphql: Boolean(input.captureGraphql),
  syncDelay: isValidEsTimeValue(input.syncDelay)
    ? input.syncDelay
    : DEFAULT_SESSION_REPLAY_SETTINGS.syncDelay,
});

export const groupingFromSettings = (settings: SessionReplaySettings): UrlGroupingConfig => ({
  depth: settings.urlGroupingDepth,
  rules: parseGroupingRules(settings.urlGroupingRules),
});

/** SDK `capture` block reflected in inject / auto-start. */
export const sdkCaptureFromSettings = (settings: SessionReplaySettings) => ({
  ignoreUrls: parseIgnoreUrls(settings.ignoreUrls),
  urlGrouping: groupingFromSettings(settings),
  graphql: settings.captureGraphql,
});
