/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { maxBy, uniqBy, upperFirst } from 'lodash';
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
import type { BriefCandidate, BriefFact, BriefPriority, RiskAtStart } from './brief_types';
import {
  BRIEF_PERIOD_LABELS,
  BRIEF_TILE_DEFINITIONS,
  formatCountOf,
  formatStoredValue,
  getPeriodStart,
} from './describe_scope';

/** As the Risk movers count: a change of at least this many points. */
const RISK_CHART_MIN_CHANGE = 10;

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

const DAY_MS = 24 * 3_600_000;

/** On the store's first day, first seen covers every existing entity, so it doesn't mean new. */
const describeFirstSeen = (
  firstSeen: string,
  storeStartTimestamp: string | undefined,
  periodStart: Date,
  period: string
): string => {
  const date = firstSeen.slice(0, 10);
  const firstSeenTime = new Date(firstSeen).getTime();
  if (
    storeStartTimestamp !== undefined &&
    firstSeenTime - new Date(storeStartTimestamp).getTime() < DAY_MS
  ) {
    return `First seen by the Entity Store ${date}, its first day of data`;
  }
  if (firstSeenTime < periodStart.getTime()) {
    return `First seen by the Entity Store ${date}`;
  }
  return `First seen by the Entity Store ${date}, inside the last ${period}`;
};

/** The risk change of the candidate, or of its group member that moved most, compared as the Risk movers tile does. */
const describeRiskChange = (
  candidate: BriefCandidate,
  { aliasesById, scoresById }: RiskAtStart,
  period: string,
  periodStart: Date
): Pick<BriefFact, 'text' | 'riskChangeEntity'> | undefined => {
  const members = uniqBy(
    [candidate.record, ...(aliasesById.get(candidate.id) ?? [])],
    (record) => record.entity?.id
  ).flatMap(({ entity }) => {
    const now = readRisk(entity?.risk);
    if (!entity?.id || !now) {
      return [];
    }
    const start = scoresById.get(entity.id);
    return [{ id: entity.id, name: entity.name ?? entity.id, now, start }];
  });
  const moved = maxBy(members, ({ now, start }) =>
    start === undefined ? -1 : Math.abs(Math.round(now.score) - Math.round(start))
  );
  if (!moved) {
    return undefined;
  }
  const { id, name, now, start } = moved;
  // The member's type is stated, or the model guesses it from the name (a user `jdoe@LAPTOP` read as a host).
  const subject =
    id === candidate.id
      ? ''
      : `${candidate.type} ${JSON.stringify(name)} in the same resolution group: `;
  // Only a real move gets a chart, by the Risk movers threshold: a wobble or a first score explains nothing.
  const hasMoved =
    start !== undefined &&
    Math.abs(Math.round(now.score) - Math.round(start)) >= RISK_CHART_MIN_CHANGE;
  return {
    text: upperFirst(`${subject}${describeScoreChange(start, now.score, period, periodStart)}`),
    riskChangeEntity: hasMoved ? { id, name, type: candidate.type } : undefined,
  };
};

const describeScoreChange = (
  start: number | undefined,
  now: number,
  period: string,
  periodStart: Date
): string => {
  const nowScore = Math.round(now);
  if (start === undefined) {
    return `no risk score at the start of the last ${period}, ${nowScore} now`;
  }
  const startScore = Math.round(start);
  const change = nowScore - startScore;
  const date = periodStart.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
  const prefix = `risk score ${startScore} at the start of the last ${period} (${date}), ${nowScore} now`;
  if (change === 0) {
    return `${prefix}, unchanged`;
  }
  return `${prefix}, ${change > 0 ? 'up' : 'down'} ${Math.abs(change)} points`;
};

/** Facts about each candidate, numbered from 1. Risk change facts need `riskAtStart`. */
export const buildFacts = (
  candidates: BriefCandidate[],
  scope: EntityAnalyticsScope,
  {
    riskAtStart,
    storeStartTimestamp,
  }: { riskAtStart?: RiskAtStart; storeStartTimestamp?: string } = {}
): BriefFact[] => {
  const period = BRIEF_PERIOD_LABELS[scope.period];
  const periodStart = getPeriodStart(scope);
  const facts: BriefFact[] = [];
  for (const candidate of candidates) {
    const add = (text: string, riskChangeEntity?: BriefFact['riskChangeEntity']) =>
      facts.push({ id: facts.length + 1, entityId: candidate.id, text, riskChangeEntity });
    for (const tileId of candidate.tileIds) {
      // What the entity did, not which tile shows it: readers don't know the page's tiles.
      add(upperFirst(BRIEF_TILE_DEFINITIONS[tileId](period)));
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
    const riskChange =
      riskAtStart && describeRiskChange(candidate, riskAtStart, period, periodStart);
    if (riskChange) {
      add(riskChange.text, riskChange.riskChangeEntity);
    }
    const criticality = getAssetCriticality(candidate);
    if (criticality) {
      add(`Asset criticality: ${formatStoredValue(criticality)}`);
    }
    if (extractIsPrivileged(candidate)) {
      add('On the privileged user watchlist');
    }
    const otherWatchlists = (getEntityAttributes(candidate)?.watchlists ?? []).filter(
      (watchlist) => !matchesPrivilegedWatchlist([watchlist])
    );
    // Watchlist ids are not names, so only the count is stated.
    if (otherWatchlists.length > 0) {
      add(`On ${formatCountOf(otherWatchlists.length, 'other watchlist', 'other watchlists')}`);
    }
    const firstSeen = getEntityLifecycle(candidate)?.first_seen;
    if (firstSeen) {
      add(describeFirstSeen(firstSeen, storeStartTimestamp, periodStart, period));
    }
  }
  return facts;
};

/** The risk change fact cited by the first priority that cites one. Only it gets a risk-history chart. */
export const getFirstCitedRiskChange = (
  priorities: BriefPriority[],
  facts: BriefFact[]
): BriefFact | undefined =>
  priorities
    .flatMap(({ factIds }) =>
      facts.filter(({ id, riskChangeEntity }) => riskChangeEntity && factIds.includes(id))
    )
    .at(0);
