/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
}

export const SESSION_REPLAY_SETTINGS_SO_TYPE = 'ux-session-replay-settings';

/** Single well-known document id — there is one settings object per deployment. */
export const SESSION_REPLAY_SETTINGS_SO_ID = 'session-replay-settings';

export const SESSION_REPLAY_SETTINGS_API = '/internal/ux/session_replay/settings';

export const OTLP_ENDPOINT_MAX_LENGTH = 2048;
export const SERVICE_NAME_MAX_LENGTH = 256;

export const DEFAULT_SESSION_REPLAY_SETTINGS: SessionReplaySettings = {
  enabled: false,
  otlpEndpoint: '',
  serviceName: 'kibana',
  sampleRate: 100,
};

/** Clamp/trim untrusted input to the persisted bounds. */
export const normalizeSessionReplaySettings = (
  input: SessionReplaySettings
): SessionReplaySettings => ({
  enabled: Boolean(input.enabled),
  otlpEndpoint: String(input.otlpEndpoint ?? '').slice(0, OTLP_ENDPOINT_MAX_LENGTH),
  serviceName:
    String(input.serviceName ?? '').slice(0, SERVICE_NAME_MAX_LENGTH) ||
    DEFAULT_SESSION_REPLAY_SETTINGS.serviceName,
  sampleRate: Math.min(100, Math.max(0, Math.round(Number(input.sampleRate) || 0))),
});
