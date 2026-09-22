/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { HuntTechnology, IndexScopeWindow, ResolvedIndexScope } from '@kbn/alertzero-common';
import { HUNT_ALERTS_INDEX_PATTERN_PREFIX } from '../../../../../common/constants';

/** Default lookback window: 30 days. */
const DEFAULT_WINDOW_DAYS = 30;

/** Default row limit per search. */
const DEFAULT_ROW_LIMIT = 25;

/**
 * Per-technology index pattern requirements.
 *
 * `required`: patterns the hunt cannot run without — zero resolved required
 * patterns means `blocked`.
 * `optional`: extension patterns whose absence only degrades coverage.
 * `.alerts-security.alerts-{spaceId}` is appended by `resolveIndexScope`
 * for every technology since it is space-derived, not technology-derived.
 *
 * Adding a technology means adding both a `HuntTechnology` union member and
 * an entry here; the type system will not do it for you.
 */
const TECHNOLOGY_INDEX_MAP: Record<HuntTechnology, { required: string[]; optional: string[] }> = {
  aws_iam: {
    required: ['logs-aws.*'],
    optional: ['logs-endpoint.events.*'],
  },
  fortigate: {
    required: ['logs-fortinet.*'],
    optional: [],
  },
};

const alertsIndexPattern = (spaceId: string): string =>
  `${HUNT_ALERTS_INDEX_PATTERN_PREFIX}${spaceId}`;

const defaultWindow = (): IndexScopeWindow => ({
  from: new Date(Date.now() - DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  to: new Date().toISOString(),
});

/**
 * Resolves whether a technology's target indices actually exist in the given
 * space. Every pattern — required, optional, and the space-derived alerts
 * pattern — is checked with `resolveIndex` so a missing integration reads as
 * `blocked` or `degraded` instead of a hunt silently querying nothing.
 */
export const resolveIndexScope = async ({
  esClient,
  technology,
  spaceId,
  window,
  rowLimit = DEFAULT_ROW_LIMIT,
}: {
  esClient: ElasticsearchClient;
  technology: HuntTechnology;
  spaceId: string;
  window?: IndexScopeWindow;
  rowLimit?: number;
}): Promise<ResolvedIndexScope> => {
  const { required, optional } = TECHNOLOGY_INDEX_MAP[technology];
  const alertsPattern = alertsIndexPattern(spaceId);
  const resolvedWindow = window ?? defaultWindow();

  const checkPattern = async (pattern: string): Promise<[string, boolean]> => {
    const response = await esClient.indices.resolveIndex({
      name: pattern,
      expand_wildcards: 'open',
    });
    return [pattern, response.indices.length > 0 || response.data_streams.length > 0];
  };

  const [requiredResults, optionalResults] = await Promise.all([
    Promise.all(required.map(checkPattern)),
    Promise.all([...optional, alertsPattern].map(checkPattern)),
  ]);

  const missing: string[] = [];
  for (const [pattern, present] of [...requiredResults, ...optionalResults]) {
    if (!present) {
      missing.push(pattern);
    }
  }

  const hasResolvedRequired = requiredResults.some(([, present]) => present);
  const missingOptionalCount = optionalResults.filter(([, present]) => !present).length;

  let status: ResolvedIndexScope['status'];
  if (!hasResolvedRequired) {
    status = 'blocked';
  } else if (missingOptionalCount > 0) {
    status = 'degraded';
  } else {
    status = 'ok';
  }

  return {
    technology,
    required,
    optional: [...optional, alertsPattern],
    missing,
    status,
    window: resolvedWindow,
    rowLimit,
  };
};
