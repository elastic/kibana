/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpFetchOptions } from '@kbn/core/public';
import { ALERT_ANALYSIS_SETTINGS_API_VERSION, ALERT_ANALYSIS_SETTINGS_URL } from './constants';
import { spacePath, type KbnRequestContext } from './worker_settings';

type AlertAnalysisSettings = Record<string, unknown> & { workflowEnabled: boolean };

const request = async (
  { fetch, spaceId }: KbnRequestContext,
  method: 'GET' | 'PUT',
  settings?: AlertAnalysisSettings
): Promise<AlertAnalysisSettings> => {
  const { settings: current } = (await fetch(spacePath(spaceId, ALERT_ANALYSIS_SETTINGS_URL), {
    method,
    version: ALERT_ANALYSIS_SETTINGS_API_VERSION,
    headers: {
      'elastic-api-version': ALERT_ANALYSIS_SETTINGS_API_VERSION,
      'kbn-xsrf': 'true',
    },
    ...(settings ? { body: JSON.stringify(settings) } : {}),
  } satisfies HttpFetchOptions)) as { settings: AlertAnalysisSettings };
  return current;
};

/**
 * Turning on the Alert Triage Worker is refused ("requires alert analysis to be turned on for
 * this space") while the space's alert-analysis workflow setting is off, which is its default.
 * That setting is `readonly` in ui-settings and owned by security_solution, so the only way to
 * flip it is security_solution's settings route, which takes the whole settings object: read it,
 * change `workflowEnabled` only, and return a function that PUTs the original object back.
 */
export const enableAlertAnalysisInSpace = async (
  ctx: KbnRequestContext
): Promise<() => Promise<void>> => {
  const prior = await request(ctx, 'GET');
  if (!prior.workflowEnabled) {
    await request(ctx, 'PUT', { ...prior, workflowEnabled: true });
  }
  return async () => {
    if (!prior.workflowEnabled) await request(ctx, 'PUT', prior);
  };
};
