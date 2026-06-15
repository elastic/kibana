/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

import type { AxiosInstance } from 'axios';
import type { KibanaRequest } from '@kbn/core/server';
import { resolveConnectorAxiosClient } from './resolve_connector_client';

export const SLACK_CONNECTOR_TYPE_ID = '.slack2';
const SLACK_API_BASE = 'https://slack.com/api';

interface SlackApiResponse<T> {
  ok: boolean;
  error?: string;
  needed?: string;
  provided?: string;
  response_metadata?: {
    next_cursor?: string;
  };
}

interface SlackSearchMessage {
  author_name?: string;
  author_user_id?: string;
  channel_id?: string;
  channel_name?: string;
  message_ts?: string;
  text?: string;
  permalink?: string;
}

export interface SlackSearchMessagesResult {
  text: string;
  channelId?: string;
  channelName?: string;
  messageTs?: string;
  permalink?: string;
}

const assertSlackOk = <T>(response: SlackApiResponse<T>, action: string): T => {
  if (!response.ok) {
    const details = [response.error, response.needed ? `needed=${response.needed}` : undefined]
      .filter(Boolean)
      .join(', ');
    throw new Error(`Slack ${action} failed${details ? `: ${details}` : ''}`);
  }
  return response as T;
};

export const resolveSlackClient = async ({
  request,
  slackConnectorId,
}: {
  request: KibanaRequest;
  slackConnectorId: string;
}): Promise<AxiosInstance> =>
  resolveConnectorAxiosClient({
    request,
    connectorIdOrName: slackConnectorId,
    expectedTypeId: SLACK_CONNECTOR_TYPE_ID,
    additionalHeaders: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });

const formatSlackAfterDate = (lookbackHours: number): string => {
  const after = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
  return after.toISOString().slice(0, 10);
};

export const searchSlackReleaseMessages = async ({
  client,
  channelName,
  lookbackHours,
  query = 'release OR deploy OR promotion OR "branch cut" OR "feature freeze"',
}: {
  client: AxiosInstance;
  channelName: string;
  lookbackHours: number;
  query?: string;
}): Promise<SlackSearchMessagesResult[]> => {
  const normalizedChannel = channelName.replace(/^#/, '');
  const finalQuery = `${query} in:#${normalizedChannel} after:${formatSlackAfterDate(lookbackHours)}`;
  const messages: SlackSearchMessagesResult[] = [];
  let cursor: string | undefined;

  do {
    const response = await client.post<
      SlackApiResponse<{ messages?: { matches?: SlackSearchMessage[] } }>
    >(`${SLACK_API_BASE}/assistant.search.context`, {
      query: finalQuery,
      channel_types: ['public_channel', 'private_channel'],
      content_types: ['messages'],
      include_context_messages: false,
      include_bots: true,
      count: 100,
      cursor,
    });

    const data = assertSlackOk(response.data, 'assistant.search.context');
    for (const match of data.messages?.matches ?? []) {
      if (!match.text) {
        continue;
      }
      messages.push({
        text: match.text,
        channelId: match.channel_id,
        channelName: match.channel_name ?? normalizedChannel,
        messageTs: match.message_ts,
        permalink: match.permalink,
      });
    }

    cursor = response.data.response_metadata?.next_cursor || undefined;
  } while (cursor);

  return messages;
};
