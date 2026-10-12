/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpFetchOptions } from '@kbn/core/public';
import { ALERTZERO_ENABLED_SETTING_ID } from './constants';
import { spacePath, type KbnRequestContext } from './worker_settings';

const SETTINGS_URL = '/internal/kibana/settings';

interface UserProvidedSettings {
  settings?: Record<string, { userValue?: unknown } | undefined>;
}

const postSettings = async (
  { fetch, spaceId }: KbnRequestContext,
  changes: Record<string, unknown>
): Promise<void> => {
  await fetch(spacePath(spaceId, SETTINGS_URL), {
    method: 'POST',
    headers: { 'kbn-xsrf': 'true' },
    body: JSON.stringify({ changes }),
  } satisfies HttpFetchOptions);
};

/**
 * `securitySolution:enableAlertZero` is a per-space setting that defaults to
 * false, and every `/internal/alertzero/**` route 404s while it is false. Turns
 * it on in the cell's space and returns a function that puts back what was
 * there: the prior user value, or no user value at all (`null` removes it) when
 * the space never set one.
 */
export const enableAlertZeroInSpace = async (
  ctx: KbnRequestContext
): Promise<() => Promise<void>> => {
  const { settings } = (await ctx.fetch(spacePath(ctx.spaceId, SETTINGS_URL), {
    method: 'GET',
    headers: { 'kbn-xsrf': 'true' },
  } satisfies HttpFetchOptions)) as UserProvidedSettings;
  const prior = settings?.[ALERTZERO_ENABLED_SETTING_ID]?.userValue;
  await postSettings(ctx, { [ALERTZERO_ENABLED_SETTING_ID]: true });
  return () => postSettings(ctx, { [ALERTZERO_ENABLED_SETTING_ID]: prior ?? null });
};
