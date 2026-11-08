/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useAbortableAsync } from '@kbn/react-hooks';
import type { SavedView, SavedViewAttributes } from '../../common/saved_views';
import { useApiClient } from './use_api_client';

export interface SavedViews {
  views: SavedView[];
  /** True until the first list arrives, and while it loads again. */
  isLoading: boolean;
  error: Error | undefined;
  refresh: () => void;
  /** Saves a new view and lists the views again; rejects when the name is taken. */
  create: (attributes: SavedViewAttributes) => Promise<SavedView>;
  /** Saves a view again in place of what it kept, and lists the views again. */
  update: (id: string, attributes: SavedViewAttributes) => Promise<SavedView>;
  remove: (id: string) => Promise<void>;
}

/** The message a failed request carries from the server, or the error's own. */
export const messageOfRequestError = (error: unknown): string => {
  const body = typeof error === 'object' && error !== null ? Reflect.get(error, 'body') : undefined;
  const serverMessage =
    typeof body === 'object' && body !== null ? Reflect.get(body, 'message') : undefined;
  if (typeof serverMessage === 'string') {
    return serverMessage;
  }
  return error instanceof Error ? error.message : String(error);
};

/**
 * The saved views of the space, read when the hook mounts: use it where the views are shown, not
 * where they are not, as every mount is a request.
 */
export const useSavedViews = (): SavedViews => {
  const apiClient = useApiClient();

  const { value, loading, error, refresh } = useAbortableAsync(
    ({ signal }) => apiClient.fetch('GET /internal/digital_experience/views', { signal }),
    [apiClient]
  );

  const create = useCallback(
    async (attributes: SavedViewAttributes) => {
      const view = await apiClient.fetch('POST /internal/digital_experience/views', {
        params: { body: attributes },
      });
      refresh();
      return view;
    },
    [apiClient, refresh]
  );

  const update = useCallback(
    async (id: string, attributes: SavedViewAttributes) => {
      const view = await apiClient.fetch('PUT /internal/digital_experience/views/{id}', {
        params: { path: { id }, body: attributes },
      });
      refresh();
      return view;
    },
    [apiClient, refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      await apiClient.fetch('DELETE /internal/digital_experience/views/{id}', {
        params: { path: { id } },
      });
      refresh();
    },
    [apiClient, refresh]
  );

  return {
    views: value?.views ?? [],
    isLoading: loading,
    error,
    refresh,
    create,
    update,
    remove,
  };
};
