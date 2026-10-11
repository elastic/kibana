/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared types for the "Elastic Slack App" connection surfaced under Significant
 * Events settings. The connection binds a Kibana deployment to the Nightshift
 * Relay service so the Relay can call Agent Builder on behalf of the deployment.
 */

export const RELAY_APP_CONNECTION_STATUS = {
  notConnected: 'not_connected',
  oauthInProgress: 'oauth_in_progress',
  /** The install completed; the admin must confirm the Slack workspace before it is used. */
  pendingConfirmation: 'pending_confirmation',
  connected: 'connected',
  error: 'error',
} as const;

export type RelayAppConnectionStatus =
  (typeof RELAY_APP_CONNECTION_STATUS)[keyof typeof RELAY_APP_CONNECTION_STATUS];

/** Response from the connect route: the Slack OAuth consent URL the browser opens. */
export interface SlackAppConnectResponse {
  authorizeUrl: string;
}

export interface SlackAppWorkspace {
  /** Slack team id. */
  tenantKey: string;
  /** Workspace name. Anyone can pick any name, so it is a display label only. */
  name?: string;
  /** Workspace URL from Slack `auth.test` (https://api.slack.com/methods/auth.test), unique to the workspace. */
  url?: string;
}

/** Response from the status route driving the card state. */
export interface SlackAppStatusResponse {
  available: boolean;
  status: RelayAppConnectionStatus;
  error?: string;
  /** Present once the install has registered a workspace (`pending_confirmation` and `connected`). */
  workspace?: SlackAppWorkspace;
}

export interface SlackAppConfirmResponse {
  status: typeof RELAY_APP_CONNECTION_STATUS.connected;
}

export interface SlackAppDisconnectResponse {
  status: 'disconnected';
}

/**
 * Binding status for a connected channel. The bindings route only ever returns this
 * deployment's own SUB bindings, so every entry is `bound_to_self`.
 */
export type SlackChannelBindingStatus = 'bound_to_self';

/**
 * A single binding entry for a connected workspace, as returned by the bindings route.
 * `channel` = Slack channel id for a SUB-scope binding; `displayName` = the channel's
 * persisted display-name snapshot from the Relay, when available.
 */
export interface SlackChannelBinding {
  /** Slack channel id for a channel-specific (`SUB`-scope) binding. */
  channel?: string;
  /** Human-readable channel name from the Relay's persisted display snapshot. */
  displayName?: string;
  /** Binding status for this entry; always `bound_to_self` for the connected-channel list. */
  status: SlackChannelBindingStatus;
}

/** Response from the per-connection bindings route (one page of connected channels). */
export interface SlackAppBindingsResponse {
  bindings: SlackChannelBinding[];
  /** Opaque cursor for the next page of connected channels; absent on the last page. */
  nextCursor?: string;
}

/** Response from the per-channel bind route. */
export interface SlackAppBindChannelResponse {
  status: 'bound';
}

/** Response from the per-channel unbind route. */
export interface SlackAppUnbindChannelResponse {
  status: 'unbound';
}
