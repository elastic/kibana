/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { HttpHandler } from '@kbn/core/public';
import { PUBLIC_API_VERSION } from './constants';

/**
 * Creates the empty conversation the analysis takes as its Investigation. The analysis
 * only checks that it exists; its content is not evidence.
 *
 * The conversation is public because the workflow reads it with its own API key, whose
 * user id does not match the basic-auth owner id when the user has no profile.
 */
export const createInvestigation = async (fetch: HttpHandler, title: string): Promise<string> => {
  const conversationId = randomUUID();
  await fetch('/api/agent_builder/conversations', {
    method: 'POST',
    version: PUBLIC_API_VERSION,
    headers: { 'elastic-api-version': PUBLIC_API_VERSION },
    body: JSON.stringify({
      conversation_id: conversationId,
      title,
      access_control: { access_mode: 'public', entries: [] },
    }),
  });
  return conversationId;
};

export const deleteConversation = async (
  fetch: HttpHandler,
  conversationId: string
): Promise<void> => {
  await fetch(`/api/agent_builder/conversations/${encodeURIComponent(conversationId)}`, {
    method: 'DELETE',
    version: PUBLIC_API_VERSION,
    headers: { 'elastic-api-version': PUBLIC_API_VERSION },
  });
};

const isShardNotReady = (error: unknown): boolean =>
  error instanceof Error && error.message.includes('no_shard_available_action_exception');

/**
 * Waits until conversations can be created. On a fresh stack the conversations index
 * shard is not allocated yet and Agent Builder answers with a 500 the evals client
 * does not retry, so concurrent tasks would all fail on their first request.
 */
export const waitForConversationsReady = async (
  fetch: HttpHandler,
  { maxAttempts = 20, retryDelayMs = 3000 }: { maxAttempts?: number; retryDelayMs?: number } = {}
): Promise<void> => {
  for (let attempt = 1; ; attempt++) {
    try {
      const probeId = await createInvestigation(fetch, 'FP/TP eval readiness probe');
      await deleteConversation(fetch, probeId);
      return;
    } catch (error) {
      if (!isShardNotReady(error) || attempt >= maxAttempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
};
