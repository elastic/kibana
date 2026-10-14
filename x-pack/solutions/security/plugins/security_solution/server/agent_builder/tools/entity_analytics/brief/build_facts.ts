/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity, EntityRiskLevels } from '@kbn/entity-store/common';
import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import { getRiskLevel } from '../../../../../common/entity_analytics/risk_engine/risk_levels';
import {
  extractIsPrivileged,
  getAssetCriticality,
  getEntityAttributes,
  getEntityLifecycle,
  matchesPrivilegedWatchlist,
} from '../../../../lib/entity_analytics/lead_generation/observation_modules/utils';
import type { BriefCandidate, BriefFact } from './brief_types';
import {
  BRIEF_PERIOD_LABELS,
  BRIEF_TILE_DEFINITIONS,
  BRIEF_TILE_TITLES,
  getPeriodStart,
} from './describe_scope';

interface EntityRisk {
  /** Normalised score, 0 to 100. */
  score: number;
  level: EntityRiskLevels;
}

const readRisk = (
  risk: { calculated_score_norm?: number; calculated_level?: EntityRiskLevels } | undefined
): EntityRisk | undefined => {
  const score = risk?.calculated_score_norm;
  if (score === undefined || !Number.isFinite(score)) {
    return undefined;
  }
  return { score, level: risk?.calculated_level ?? getRiskLevel(score) };
};

/** The risk candidates are ranked on: the resolution group's when scored, otherwise the entity's own. */
export const getRankRisk = ({ entity }: Entity): EntityRisk | undefined =>
  readRisk(entity?.relationships?.resolution?.risk) ?? readRisk(entity?.risk);

const describeRisk = (label: string, { score, level }: EntityRisk): string =>
  `${label}: ${level} (score ${Math.round(score)})`;

const describeFirstSeen = (firstSeen: string, periodStart: Date, period: string): string => {
  const date = firstSeen.slice(0, 10);
  if (new Date(firstSeen) < periodStart) {
    return `First seen by the Entity Store ${date}`;
  }
  return `First seen by the Entity Store ${date}, inside the last ${period}`;
};

/** Facts about each candidate from its tile membership and Entity Store record, numbered from 1. */
export const buildFacts = (
  candidates: BriefCandidate[],
  scope: EntityAnalyticsScope
): BriefFact[] => {
  const period = BRIEF_PERIOD_LABELS[scope.period];
  const periodStart = getPeriodStart(scope);
  const facts: BriefFact[] = [];
  for (const candidate of candidates) {
    const add = (text: string) =>
      facts.push({ id: facts.length + 1, entityId: candidate.id, text });
    for (const tileId of candidate.tileIds) {
      add(`In the "${BRIEF_TILE_TITLES[tileId]}" tile: ${BRIEF_TILE_DEFINITIONS[tileId](period)}`);
    }
    // The tiles test the entity's own risk; the group's is a separate fact when it differs.
    const ownRisk = readRisk(candidate.record.entity?.risk);
    const groupRisk = readRisk(candidate.record.entity?.relationships?.resolution?.risk);
    if (ownRisk) {
      add(describeRisk('Current risk', ownRisk));
    }
    if (groupRisk && Math.round(groupRisk.score) !== Math.round(ownRisk?.score ?? -1)) {
      add(describeRisk('Resolution group risk', groupRisk));
    }
    const criticality = getAssetCriticality(candidate);
    if (criticality) {
      add(`Asset criticality: ${criticality}`);
    }
    if (extractIsPrivileged(candidate)) {
      add('On the privileged user watchlist');
    }
    const otherWatchlists = (getEntityAttributes(candidate)?.watchlists ?? []).filter(
      (watchlist) => !matchesPrivilegedWatchlist([watchlist])
    );
    // Watchlist ids are not names, so only the count is stated.
    if (otherWatchlists.length > 0) {
      add(`On ${otherWatchlists.length} other watchlist${otherWatchlists.length === 1 ? '' : 's'}`);
    }
    const firstSeen = getEntityLifecycle(candidate)?.first_seen;
    if (firstSeen) {
      add(describeFirstSeen(firstSeen, periodStart, period));
    }
  }
  return facts;
};
