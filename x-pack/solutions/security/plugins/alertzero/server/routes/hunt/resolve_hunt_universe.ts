/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, Logger } from '@kbn/core/server';
import { SECURITY_SOLUTION_DEFAULT_INDEX_ID } from '@kbn/management-settings-ids';
import type { HuntUniverse } from '../../services/watches/hunt/common/partition_hunt_universe';
import { partitionHuntUniverse } from '../../services/watches/hunt/common/partition_hunt_universe';

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
 * missing, not an array of patterns, empty, or unreadable, so a misconfigured space still
 * hunts the streams Fleet integrations write rather than nothing.
 *
 * Positive entries whose index name is dot-prefixed (hidden and alerts indices) are split off
 * into `policySkipped` and never searched. A valid setting that names only such entries is
 * returned as is, without the fallback, so `patterns` can hold no positive entry.
 *
 * The read lives in the routes, not the service: the service takes the list as a parameter
 * and tests inject it directly.
 */
export const resolveHuntUniverse = async (
  context: HuntUniverseContext,
  logger: Logger,
  crossProjectSearch: boolean
): Promise<HuntUniverse> => {
  const { uiSettings } = await context.core;
  let configured: string[] | undefined;
  try {
    configured = await uiSettings.client.get<string[] | undefined>(
      SECURITY_SOLUTION_DEFAULT_INDEX_ID
    );
  } catch (err) {
    // The fallback exists so a space whose setting cannot be used still hunts. A read that
    // throws (settings saved object unavailable, the setting unregistered in this context) is
    // that same case, not a reason to fail the whole hunt.
    logger.warn(
      `Reading ${SECURITY_SOLUTION_DEFAULT_INDEX_ID} failed; hunting ${FALLBACK_HUNT_UNIVERSE.join(
        ', '
      )} instead: ${err instanceof Error ? err.message : String(err)}`
    );
    return { patterns: [...FALLBACK_HUNT_UNIVERSE], policySkipped: [] };
  }
  // Elasticsearch splits a multi-target expression on commas whatever the array boundaries
  // were, so a comma-joined entry is read as the entries it holds. Otherwise a hidden name
  // inside one would pass the policy split below as part of a longer string.
  const entries = isPatternList(configured)
    ? configured
        .flatMap((pattern) => pattern.split(','))
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    : [];
  if (entries.length > 0) return partitionHuntUniverse(entries, crossProjectSearch);

  logger.warn(
    `${SECURITY_SOLUTION_DEFAULT_INDEX_ID} is missing or not a list of index patterns; hunting ${FALLBACK_HUNT_UNIVERSE.join(
      ', '
    )} instead`
  );
  return { patterns: [...FALLBACK_HUNT_UNIVERSE], policySkipped: [] };
};
