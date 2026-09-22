/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout-security';
import { INTERNAL_HEADERS, LIST_ACTIONS_PATH } from './constants';

/**
 * Calls `GET /internal/alertzero/actions`.
 *
 * The response type is derived from `apiClient.get` rather than imported:
 * `@kbn/scout-security` (the entrypoint security-solution tests are required to
 * use) re-exports `ApiClientFixture` but not `ApiClientResponse`.
 *
 * `categories` is passed as a repeated query param (`?categories=a&categories=b`),
 * which is the shape the route's reader treats as the canonical multi-value form.
 * Pass `rawQuery` instead to exercise the comma-joined form or a malformed value.
 */
export const listActions = async (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  options: { categories?: string[]; rawQuery?: string } = {}
): Promise<Awaited<ReturnType<ApiClientFixture['get']>>> => {
  const { categories, rawQuery } = options;
  const query =
    rawQuery ??
    (categories && categories.length > 0
      ? categories.map((category) => `categories=${encodeURIComponent(category)}`).join('&')
      : '');
  const path = query ? `${LIST_ACTIONS_PATH}?${query}` : LIST_ACTIONS_PATH;

  return apiClient.get(path, {
    headers: { ...INTERNAL_HEADERS, ...cookieHeader },
    responseType: 'json',
  });
};
