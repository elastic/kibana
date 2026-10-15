/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import {
  extractIsPrivileged,
  getAssetCriticality,
  getEntityAttributes,
  getEntityLifecycle,
  matchesPrivilegedWatchlist,
} from '../../../../lib/entity_analytics/lead_generation/observation_modules/utils';
import type { BriefCandidate, EntityFacts } from './types';
import { formatStoredValue } from './describe_scope';
import { getCandidateRisk } from './read_entities';

/**
 * What the model knows about each candidate, as data. `riskAtStart` holds the scores at the start of the
 * period by candidate id; without it, the start is left out.
 */
export const buildFacts = (
  candidates: BriefCandidate[],
  scope: EntityAnalyticsScope,
  riskAtStart?: Map<string, number>
): EntityFacts[] =>
  candidates.map((candidate) => {
    const criticality = getAssetCriticality(candidate);
    const firstSeen = getEntityLifecycle(candidate)?.first_seen;
    const otherWatchlists = (getEntityAttributes(candidate)?.watchlists ?? []).filter(
      (watchlist) => !matchesPrivilegedWatchlist([watchlist])
    ).length;
    return {
      entityId: candidate.id,
      name: candidate.name,
      type: candidate.type,
      flaggedFor: candidate.tileIds,
      risk: describeRisk(candidate, riskAtStart),
      assetCriticality: criticality ? formatStoredValue(criticality) : undefined,
      privilegedUser: extractIsPrivileged(candidate) || undefined,
      otherWatchlists: otherWatchlists || undefined,
      // Relative to the capture, so no date or time zone is stated.
      firstSeen: firstSeen ? moment(firstSeen).from(scope.capturedAt) : undefined,
    };
  });

const describeRisk = (
  candidate: BriefCandidate,
  riskAtStart: Map<string, number> | undefined
): EntityFacts['risk'] => {
  const risk = getCandidateRisk(candidate);
  if (!risk) {
    return undefined;
  }
  const score = Math.round(risk.score);
  const start = riskAtStart?.get(candidate.id);
  const atPeriodStart = start === undefined ? null : Math.round(start);
  return {
    of: risk.of,
    level: risk.level,
    score,
    atPeriodStart: riskAtStart ? atPeriodStart : undefined,
    change: atPeriodStart === null ? undefined : score - atPeriodStart,
  };
};
