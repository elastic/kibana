/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertMatcher, AlertMatchParams, AlertMatchResult } from './types';

/** What one alert source produced: its result, or why it could not. A failing source does not fail the rest. */
export interface SourceOutcome {
  source: AlertMatchResult['source'];
  result?: AlertMatchResult;
  error?: string;
}

const MAX_ERROR_LENGTH = 300;

export const runMatchers = async (
  matchers: readonly AlertMatcher[],
  params: AlertMatchParams
): Promise<SourceOutcome[]> =>
  Promise.all(
    matchers.map(async (matcher): Promise<SourceOutcome> => {
      try {
        return { source: matcher.source, result: await matcher.match(params) };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { source: matcher.source, error: message.slice(0, MAX_ERROR_LENGTH) };
      }
    })
  );

/** The alerts of one entity per source, and their sum. Sources hold different alerts, so nothing overlaps. */
export const alertCountsFor = (
  outcomes: readonly SourceOutcome[],
  entityId: string
): Record<string, number> => {
  const counts: Record<string, number> = {};
  let total = 0;
  for (const { source, result } of outcomes) {
    const count = result?.alertIdsByEntity.get(entityId)?.size ?? 0;
    counts[source] = count;
    total += count;
  }
  return { ...counts, total };
};

export type SourceCoverage = { activeAlerts: number; matchedAlerts: number } | { error: string };

/** Per source: the active alerts it holds and how many of them this type's entities claimed. */
export const summarizeCoverage = (
  outcomes: readonly SourceOutcome[]
): Record<string, SourceCoverage> =>
  Object.fromEntries(
    outcomes.map(({ source, result, error }): [string, SourceCoverage] => [
      source,
      result
        ? {
            activeAlerts: result.activeAlerts,
            matchedAlerts: new Set(
              [...result.alertIdsByEntity.values()].flatMap((alertIds) => [...alertIds])
            ).size,
          }
        : { error: error ?? 'Unknown error' },
    ])
  );
