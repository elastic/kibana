/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { BehaviorSubject } from 'rxjs';

import type { CreateAPIKeyResult } from '@kbn/security-api-key-management';

/** Open-flyout target — when non-null, the global host renders the `ApiKeyFlyout`. */
export interface CreateApiKeyFlyoutTarget {
  attachmentId: string;
  defaultName?: string;
}

export const createApiKeyFlyoutTarget$ = new BehaviorSubject<CreateApiKeyFlyoutTarget | null>(null);

export const openCreateApiKeyFlyout = (target: CreateApiKeyFlyoutTarget): void => {
  createApiKeyFlyoutTarget$.next(target);
};

export const closeCreateApiKeyFlyout = (): void => {
  if (createApiKeyFlyoutTarget$.getValue() !== null) {
    createApiKeyFlyoutTarget$.next(null);
  }
};

/* ----------------------------------------------------------------------- *
 * Module-singleton store of API keys created from inside a conversation.
 *
 * The Agent Builder treats attachments as immutable once posted into a
 * round, so we can't mutate the `nightshift.createApiKey` attachment
 * data after the user fills the flyout. Instead the inline renderer
 * subscribes to this store keyed by attachment id; once the flyout
 * succeeds we record the result here and the card flips into its
 * confirmed state.
 *
 * Lives on the client only — the server's `format` continues to report
 * "blank ticket" to the LLM until the user explicitly re-attaches the
 * created key as a `nightshift.apiKey` payload (existing flow).
 * ----------------------------------------------------------------------- */

const createdApiKeys$ = new BehaviorSubject<Record<string, CreateAPIKeyResult>>({});

/** Record an API key created for a given attachment id. Idempotent. */
export const recordCreatedApiKey = (attachmentId: string, key: CreateAPIKeyResult): void => {
  const current = createdApiKeys$.getValue();
  if (current[attachmentId] && current[attachmentId].id === key.id) {
    return;
  }
  createdApiKeys$.next({ ...current, [attachmentId]: key });
};

/**
 * Read the created-key entry for a given attachment id, subscribing
 * to updates. Returns `undefined` until the user creates a key for
 * the attachment.
 */
export const useCreatedApiKey = (attachmentId: string): CreateAPIKeyResult | undefined => {
  const [value, setValue] = useState<CreateAPIKeyResult | undefined>(
    () => createdApiKeys$.getValue()[attachmentId]
  );
  useEffect(() => {
    const subscription = createdApiKeys$.subscribe((map) => setValue(map[attachmentId]));
    return () => subscription.unsubscribe();
  }, [attachmentId]);
  return value;
};
