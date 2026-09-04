/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeSelectedRemoteClusters, RUM_CCS_CLUSTERS_MAX } from './rum_ccs';
import {
  clampLookbackDays,
  isValidEsTimeValue,
  RUM_SESSIONS_LOOKBACK_DAYS,
  RUM_SESSIONS_SYNC_DELAY,
} from './rum_sessions';
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
  /** Mask `<input>` / `<textarea>` values in replay. Default on. */
  maskAllInputs: boolean;
  /** Mask all DOM text (`maskTextSelector: '*'` unless a narrower selector is set). Default off. */
  maskAllText: boolean;
  /** Record `<canvas>` pixels. Default on. */
  recordCanvas: boolean;
  /** SDK session rotation cap (`session.maxMs`). */
  sessionMaxMs: number;
  /** SDK idle rotation (`session.idleMs`). */
  sessionIdleMs: number;
  captureGraphql: boolean;
  /** Elasticsearch time value applied to session and daily transforms (`5m`, `30s`, `1h`). */
  syncDelay: string;
  /** Days of session-index history (`now-Nd` source lookback; retention is N+3 days). */
  sourceLookbackDays: number;
  /** Search every configured remote cluster (`*:index`), like SLO settings. */
  useAllRemoteClusters: boolean;
  /** Remote cluster aliases to include in reads, in addition to the local cluster. */
  selectedRemoteClusters: string[];
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
export const SELECTED_REMOTE_CLUSTERS_MAX = RUM_CCS_CLUSTERS_MAX;

/** EDOT `session.maxMs` default — 4h, vs the SDK's built-in 14m rotation. */
export const SESSION_MAX_MS_DEFAULT = 4 * 60 * 60 * 1000;
export const SESSION_MAX_MS_MIN = 15 * 60 * 1000;
export const SESSION_MAX_MS_MAX = 24 * 60 * 60 * 1000;
/** EDOT `session.idleMs` default — keep the SDK's 30m idle timeout. */
export const SESSION_IDLE_MS_DEFAULT = 30 * 60 * 1000;
export const SESSION_IDLE_MS_MIN = 5 * 60 * 1000;
export const SESSION_IDLE_MS_MAX = 4 * 60 * 60 * 1000;

export const DEFAULT_SESSION_REPLAY_SETTINGS: SessionReplaySettings = {
  enabled: false,
  otlpEndpoint: '',
  serviceName: 'kibana',
  sampleRate: 100,
  ignoreUrls: '',
  urlGroupingDepth: 3,
  urlGroupingRules: '',
  maskTextSelector: '',
  maskAllInputs: true,
  maskAllText: false,
  recordCanvas: true,
  sessionMaxMs: SESSION_MAX_MS_DEFAULT,
  sessionIdleMs: SESSION_IDLE_MS_DEFAULT,
  captureGraphql: false,
  syncDelay: RUM_SESSIONS_SYNC_DELAY,
  sourceLookbackDays: RUM_SESSIONS_LOOKBACK_DAYS,
  useAllRemoteClusters: false,
  selectedRemoteClusters: [],
};

const clampInt = (value: unknown, min: number, max: number, fallback: number): number => {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, n));
};

const clampDepth = (value: unknown): number =>
  clampInt(
    value,
    URL_GROUPING_DEPTH_MIN,
    URL_GROUPING_DEPTH_MAX,
    DEFAULT_SESSION_REPLAY_SETTINGS.urlGroupingDepth
  );

export const msToMinutes = (ms: number): number => Math.round(ms / 60_000);
export const minutesToMs = (minutes: number): number => minutes * 60_000;

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
  maskAllInputs: input.maskAllInputs !== false,
  maskAllText: input.maskAllText === true,
  recordCanvas: input.recordCanvas !== false,
  sessionMaxMs: clampInt(
    input.sessionMaxMs,
    SESSION_MAX_MS_MIN,
    SESSION_MAX_MS_MAX,
    SESSION_MAX_MS_DEFAULT
  ),
  sessionIdleMs: clampInt(
    input.sessionIdleMs,
    SESSION_IDLE_MS_MIN,
    SESSION_IDLE_MS_MAX,
    SESSION_IDLE_MS_DEFAULT
  ),
  captureGraphql: Boolean(input.captureGraphql),
  syncDelay: isValidEsTimeValue(input.syncDelay)
    ? input.syncDelay
    : DEFAULT_SESSION_REPLAY_SETTINGS.syncDelay,
  sourceLookbackDays: clampLookbackDays(
    input.sourceLookbackDays ?? DEFAULT_SESSION_REPLAY_SETTINGS.sourceLookbackDays
  ),
  useAllRemoteClusters: Boolean(input.useAllRemoteClusters),
  selectedRemoteClusters: normalizeSelectedRemoteClusters(input.selectedRemoteClusters),
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

/** rrweb privacy block — inputs masked by default; page text only when opted in. */
export const sdkPrivacyFromSettings = (
  settings: Pick<SessionReplaySettings, 'maskAllInputs' | 'maskAllText' | 'maskTextSelector'>
): { maskAllInputs: boolean; maskTextSelector?: string } => {
  const privacy: { maskAllInputs: boolean; maskTextSelector?: string } = {
    maskAllInputs: settings.maskAllInputs,
  };
  if (settings.maskAllText) {
    privacy.maskTextSelector = settings.maskTextSelector || '*';
  } else if (settings.maskTextSelector) {
    privacy.maskTextSelector = settings.maskTextSelector;
  }
  return privacy;
};

/** SDK `replay` block reflected in inject / auto-start. */
export const sdkReplayFromSettings = (
  settings: Pick<
    SessionReplaySettings,
    'sampleRate' | 'maskAllInputs' | 'maskAllText' | 'maskTextSelector' | 'recordCanvas'
  >
) => ({
  enabled: true,
  samplingRate: settings.sampleRate,
  errorSamplingRate: 100,
  quality: { recordCanvas: settings.recordCanvas },
  privacy: sdkPrivacyFromSettings(settings),
});

/** EDOT `session` block — `maxMs` / `idleMs` override the IIFE's 14m / 30m constants. */
export const sdkSessionFromSettings = (
  settings: Pick<SessionReplaySettings, 'sessionMaxMs' | 'sessionIdleMs'>,
  persistSession: boolean
) => ({
  persistSession,
  maxMs: settings.sessionMaxMs,
  idleMs: settings.sessionIdleMs,
});
