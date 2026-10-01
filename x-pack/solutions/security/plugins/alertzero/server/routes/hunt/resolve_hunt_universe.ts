/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, Logger } from '@kbn/core/server';
import { SECURITY_SOLUTION_DEFAULT_INDEX_ID } from '@kbn/management-settings-ids';

/** The universe a hunt falls back to when the default data view setting is unusable. */
export const FALLBACK_HUNT_UNIVERSE: readonly string[] = ['logs-*'];

/** The part of a route handler's context the universe read needs. */
export interface HuntUniverseContext {
  core: Promise<{ uiSettings: { client: Pick<IUiSettingsClient, 'get'> } }>;
}

// The setting is user-editable, so the runtime shape is checked whatever the declared type says.
const isPatternList = (value: string[] | undefined): value is string[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((pattern) => typeof pattern === 'string' && pattern.trim().length > 0);

/**
 * The patterns a hunt searches: the space's Security Solution default data view
 * (`securitySolution:defaultIndex`, exclusions included), which is what the analyst's own
 * Security app searches. Falls back to `['logs-*']` with one warning when the setting is
 * missing, not an array of patterns, or empty, so a misconfigured space still hunts the
 * streams Fleet integrations write rather than nothing.
 *
 * The read lives in the routes, not the service: the service takes the list as a parameter
 * and tests inject it directly.
 */
export const resolveHuntUniverse = async (
  context: HuntUniverseContext,
  logger: Logger
): Promise<string[]> => {
  const { uiSettings } = await context.core;
  const configured = await uiSettings.client.get<string[] | undefined>(
    SECURITY_SOLUTION_DEFAULT_INDEX_ID
  );
  if (isPatternList(configured)) return configured.map((pattern) => pattern.trim());

  logger.warn(
    `${SECURITY_SOLUTION_DEFAULT_INDEX_ID} is missing or not a list of index patterns; hunting ${FALLBACK_HUNT_UNIVERSE.join(
      ', '
    )} instead`
  );
  return [...FALLBACK_HUNT_UNIVERSE];
};
