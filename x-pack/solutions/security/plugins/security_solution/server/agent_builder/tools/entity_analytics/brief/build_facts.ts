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

export interface EntityRisk {
  /** Normalised score, 0 to 100. */
  score: number;
  level: EntityRiskLevels;
  fromResolutionGroup: boolean;
}

/** The entity's risk: its resolution group's when scored, otherwise its own. */
export const getEntityRisk = ({ entity }: Entity): EntityRisk | undefined => {
  const groupRisk = entity?.relationships?.resolution?.risk;
  const fromResolutionGroup = groupRisk?.calculated_score_norm !== undefined;
  const risk = fromResolutionGroup ? groupRisk : entity?.risk;
  const score = risk?.calculated_score_norm;
  if (score === undefined || !Number.isFinite(score)) {
    return undefined;
  }
  return { score, level: risk?.calculated_level ?? getRiskLevel(score), fromResolutionGroup };
};

const describeRisk = ({ score, level, fromResolutionGroup }: EntityRisk): string =>
  `Current ${fromResolutionGroup ? 'resolution group ' : ''}risk: ${level} (score ${Math.round(
    score
  )})`;

const describeFirstSeen = (firstSeen: string, periodStart: Date, period: string): string => {
  const date = firstSeen.slice(0, 10);
  if (new Date(firstSeen) < periodStart) {
    return `First seen ${date}`;
  }
  return `First seen ${date}, inside the last ${period}`;
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
    const risk = getEntityRisk(candidate.record);
    if (risk) {
      add(describeRisk(risk));
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
    if (otherWatchlists.length > 0) {
      add(`On watchlists: ${otherWatchlists.join(', ')}`);
    }
    const firstSeen = getEntityLifecycle(candidate)?.first_seen;
    if (firstSeen) {
      add(describeFirstSeen(firstSeen, periodStart, period));
    }
  }
  return facts;
};
