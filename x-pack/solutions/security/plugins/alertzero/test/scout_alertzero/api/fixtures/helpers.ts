/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import type { ListActionsResponse } from '@kbn/alertzero-common';
import { ALL_ACTION_IDS, INTERNAL_HEADERS, LIST_ACTIONS_PATH } from './constants';

/**
 * `ApiClientFixture['get']` is generic over the body type, so deriving the response from
 * `ReturnType` alone resolves `body` to `unknown`. Pin it to the route's payload; error
 * responses (400) carry a `message` instead of the catalog.
 */
export type ListActionsHttpResponse = Omit<Awaited<ReturnType<ApiClientFixture['get']>>, 'body'> & {
  body: ListActionsResponse & { message?: string };
};

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
): Promise<ListActionsHttpResponse> => {
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

/**
 * Managed action workflows are installed asynchronously after plugin start, so on a fresh or
 * slow startup the endpoint can answer 200 with a partial catalog. Polls until every expected
 * action is listed, so the suite asserts against a fully installed catalog instead of racing
 * the install.
 *
 * Mismatches are returned rather than thrown: an exception inside `expect.poll` aborts polling,
 * whereas a returned value keeps retrying and is printed in the timeout message.
 */
export const waitForActionCatalog = async (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>
): Promise<void> => {
  await expect
    .poll(
      async () => {
        const response = await listActions(apiClient, cookieHeader);
        if (response.statusCode !== 200) {
          return `status ${response.statusCode}: ${JSON.stringify(response.body)}`;
        }
        const installed = new Set(response.body.actions.map((action) => action.workflowId));
        return ALL_ACTION_IDS.filter((id) => !installed.has(id)).sort();
      },
      {
        message: 'AlertZero managed action workflows were not all installed in time',
        timeout: 120_000,
        intervals: [1_000, 2_000, 5_000],
      }
    )
    .toStrictEqual([]);
};
