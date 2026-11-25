/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { RELAY_DEV_SLACK_STUB_URL, SLACK_STUB_CHANNEL_NAME } from './constants';
import { getHttpStatus, type JsonRequest } from './http_client';
import { poll } from './kibana_steps';

const SLACK_APP_PATH = '/internal/significant_events/apps/slack';
const STUB_HOSTNAMES = ['localhost', '127.0.0.1'];

interface SlackAppStatus {
  available: boolean;
  status: string;
  error?: string;
  workspace?: { tenantKey: string; name?: string };
}

interface ChannelsResponse {
  channels: Array<{ channel: string; displayName: string }>;
}

interface BindingsResponse {
  bindings: Array<{ channel?: string; displayName?: string }>;
}

/** Whether `url` is on the Slack stub of the Relay dev container, the only Slack the setup approves. */
export const isSlackStubUrl = (url: string): boolean => {
  try {
    const { hostname, port } = new URL(url);
    return STUB_HOSTNAMES.includes(hostname) && port === new URL(RELAY_DEV_SLACK_STUB_URL).port;
  } catch {
    return false;
  }
};

/** The stub approves the install at once and redirects to the Relay's callback, which completes it. */
const approveInstall = async (authorizeUrl: string): Promise<void> => {
  const authorize = await fetch(authorizeUrl, { redirect: 'manual' });
  const callbackUrl = authorize.headers.get('location');
  if (!callbackUrl) {
    throw new Error(`The Slack stub did not redirect to the Relay (status ${authorize.status})`);
  }
  // Not followed further: the Relay then redirects to Kibana, which the host may not resolve.
  const callback = await fetch(new URL(callbackUrl, authorizeUrl), { redirect: 'manual' });
  if (callback.status >= 400) {
    throw new Error(`The Relay's Slack callback answered ${callback.status}`);
  }
};

const waitForInstall = async (kibana: JsonRequest): Promise<SlackAppStatus> => {
  let last: SlackAppStatus | undefined;
  const reached = await poll(
    async () => {
      last = await kibana<SlackAppStatus>(`${SLACK_APP_PATH}/status`);
      return last.status === 'pending_confirmation' || last.status === 'connected'
        ? last
        : undefined;
    },
    { timeoutMs: 30_000, intervalMs: 1_000 }
  );
  if (!reached) {
    throw new Error(
      `The Slack install did not complete (status ${last?.status ?? 'unknown'}${
        last?.error ? `: ${last.error}` : ''
      })`
    );
  }
  return reached;
};

const bindChannel = async (kibana: JsonRequest, log: ToolingLog): Promise<void> => {
  const { bindings } = await kibana<BindingsResponse>(`${SLACK_APP_PATH}/bindings`);
  if (bindings.some(({ displayName }) => displayName === SLACK_STUB_CHANNEL_NAME)) {
    log.success(`#${SLACK_STUB_CHANNEL_NAME} is already bound`);
    return;
  }
  const { channels } = await kibana<ChannelsResponse>(`${SLACK_APP_PATH}/available_channels`);
  const channel = channels.find(({ displayName }) => displayName === SLACK_STUB_CHANNEL_NAME);
  if (!channel) {
    log.warning(
      `The Slack stub has no #${SLACK_STUB_CHANNEL_NAME} channel; build the relay-dev image from a relay-service version whose stub ships one`
    );
    return;
  }
  await kibana(`${SLACK_APP_PATH}/bindings/${encodeURIComponent(channel.channel)}/bind`, {
    method: 'POST',
  });
  log.success(`Bound #${SLACK_STUB_CHANNEL_NAME} to this Kibana`);
};

/**
 * Connects the Relay dev container's Slack stub workspace and binds its #general channel. A real
 * Slack app, or a Kibana without a Relay, is left alone. Safe to re-run.
 */
export const connectSlackStub = async (kibana: JsonRequest, log: ToolingLog): Promise<void> => {
  const initial = await kibana<SlackAppStatus>(`${SLACK_APP_PATH}/status`);
  if (!initial.available) {
    log.info(
      'Slack is not available on this Kibana (no Relay configured); skipping the Slack setup'
    );
    return;
  }
  if (initial.status !== 'connected') {
    const { authorizeUrl } = await kibana<{ authorizeUrl: string }>(`${SLACK_APP_PATH}/connect`, {
      method: 'POST',
    });
    if (!isSlackStubUrl(authorizeUrl)) {
      log.info(
        'The Relay uses a real Slack app, not the stub; connect Slack in the Nightshift settings'
      );
      return;
    }
    await approveInstall(authorizeUrl);
    const installed = await waitForInstall(kibana);
    if (installed.status === 'pending_confirmation' && installed.workspace) {
      await kibana(`${SLACK_APP_PATH}/confirm`, {
        method: 'POST',
        body: { tenantKey: installed.workspace.tenantKey },
      });
    }
    log.success('Connected the Slack stub workspace');
  } else {
    log.success('The Slack workspace is already connected');
  }
  await bindChannel(kibana, log);
};

/** Disconnects the Slack workspace so the Relay revokes the service account it holds. */
export const disconnectSlack = async (kibana: JsonRequest): Promise<boolean> =>
  kibana(`${SLACK_APP_PATH}/disconnect`, { method: 'POST' }).then(
    () => true,
    (error) => {
      const status = getHttpStatus(error);
      if (status !== undefined && status >= 400 && status < 500) return false;
      throw error;
    }
  );
