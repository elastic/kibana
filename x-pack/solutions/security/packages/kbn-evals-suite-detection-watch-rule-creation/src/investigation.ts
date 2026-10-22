/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { HttpHandler } from '@kbn/core/public';
import { AGENT_BUILDER_API_VERSION } from './constants';

const CONVERSATIONS_URL = '/api/agent_builder/conversations';
const headers = { 'elastic-api-version': AGENT_BUILDER_API_VERSION };

const isShardNotReady = (error: unknown): boolean =>
  error instanceof Error && error.message.includes('no_shard_available_action_exception');

/**
 * Creates the empty conversation the rule-creation workflow records its proposal on
 * (`investigation_id` is a required workflow input). Only its existence matters; its content is
 * not evidence.
 *
 * The conversation is public because the workflow reads it with its own API key, whose user id
 * does not match the basic-auth owner id when the user has no profile.
 *
 * On a fresh stack the conversations index can briefly have no allocated shard, so a shard-not-ready
 * failure is retried rather than failing the first example of the run.
 */
export const createInvestigation = async (
  fetch: HttpHandler,
  title: string,
  { maxAttempts = 10, retryDelayMs = 3_000 }: { maxAttempts?: number; retryDelayMs?: number } = {}
): Promise<string> => {
  const conversationId = uuidv4();
  for (let attempt = 1; ; attempt++) {
    try {
      await fetch(CONVERSATIONS_URL, {
        method: 'POST',
        version: AGENT_BUILDER_API_VERSION,
        headers,
        body: JSON.stringify({
          conversation_id: conversationId,
          title,
          access_control: { access_mode: 'public', entries: [] },
        }),
      });
      return conversationId;
    } catch (error) {
      if (!isShardNotReady(error) || attempt >= maxAttempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
};

export const deleteInvestigation = async (
  fetch: HttpHandler,
  conversationId: string
): Promise<void> => {
  await fetch(`${CONVERSATIONS_URL}/${encodeURIComponent(conversationId)}`, {
    method: 'DELETE',
    version: AGENT_BUILDER_API_VERSION,
    headers,
  });
};
