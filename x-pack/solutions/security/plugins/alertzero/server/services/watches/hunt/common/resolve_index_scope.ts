/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { HUNT_ALERTS_INDEX_PATTERN_PREFIX } from '../../../../../common/constants';
import type { HuntTechnology, IndexScopeWindow, ResolvedIndexScope } from './types';

/** Default lookback window: 30 days, matching mustard's `DEFAULT_LOOKBACK_DAYS` (hunt_for_threat.ts:102). */
const DEFAULT_WINDOW_DAYS = 30;

/** Default row limit per search, matching mustard's `size = 25` default (hunt_for_threat.ts:193). */
const DEFAULT_ROW_LIMIT = 25;

/**
 * Per-technology index pattern requirements.
 *
 * `required`: patterns the hunt cannot run without — zero resolved required
 * patterns means `blocked`.
 * `optional`: extension patterns whose absence only degrades coverage.
 * `.alerts-security.alerts-{spaceId}` is not listed here per technology; it's
 * appended for every technology by `resolveIndexScope` since it's
 * space-derived, not technology-derived (buildout.md:175).
 *
 * MVP scope is AWS IAM and FortiGate only (buildout.md:175, research.md:25,
 * research.md:194). Other technologies mustard's flat allow-list touched
 * (Endpoint, Vulnerability, Okta, Kubernetes, GitHub, Network Traffic) are
 * deliberately not mapped here yet — see open-questions.md #4. Adding a
 * technology means adding both a `HuntTechnology` union member and an entry
 * here; the type system will not do it for you.
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
 * space, rather than assuming a fixed allow-list is present (mustard's
 * `constants.ts:689-698` is the negative example this replaces — a missing
 * index there reads as a clean zero-hit search, not as `blocked`).
 *
 * Every pattern — required, optional, and the space-derived alerts pattern —
 * is checked with `resolveIndex` so a missing integration reads as `blocked`
 * or `degraded` instead of a hunt silently querying nothing. `window` and
 * `rowLimit` are caller-suppliable and default in this module when omitted
 * (buildout.md:175); the search itself keeps `ignore_unavailable: true`
 * (hunt_for_threat.ts:283-285) but this projection carries the truth about
 * what was missing.
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
