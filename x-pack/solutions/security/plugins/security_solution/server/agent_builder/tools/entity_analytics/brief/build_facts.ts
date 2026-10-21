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
import type { BriefCandidate, EntityAlerts, EntityFacts } from './types';
import { formatStoredValue } from './describe_scope';
import { getCandidateRisk } from './read_entities';

/** What the model knows about each candidate, as data. */
export const buildFacts = (
  candidates: BriefCandidate[],
  scope: EntityAnalyticsScope,
  alertsByEntityId: Record<string, EntityAlerts> = {}
): EntityFacts[] =>
  candidates.map((candidate) => {
    const criticality = getAssetCriticality(candidate);
    const firstSeen = getEntityLifecycle(candidate)?.first_seen;
    const otherWatchlists = (getEntityAttributes(candidate)?.watchlists ?? []).filter(
      (watchlist) => !matchesPrivilegedWatchlist([watchlist])
    ).length;
    const risk = getCandidateRisk(candidate);
    return {
      entityId: candidate.id,
      name: candidate.name,
      type: candidate.type,
      flaggedFor: candidate.tileIds,
      risk: risk && { of: risk.of, level: risk.level, score: Math.round(risk.score) },
      assetCriticality: criticality ? formatStoredValue(criticality) : undefined,
      privilegedUser: extractIsPrivileged(candidate) || undefined,
      alerts: alertsByEntityId[candidate.id],
      otherWatchlists: otherWatchlists || undefined,
      // Relative to the capture, so no date or time zone is stated.
      firstSeen: firstSeen ? moment(firstSeen).from(scope.capturedAt) : undefined,
    };
  });
