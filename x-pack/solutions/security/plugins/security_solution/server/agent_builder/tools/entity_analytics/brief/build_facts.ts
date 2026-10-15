/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { EntityRiskLevels } from '@kbn/entity-store/common';
import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import { getRiskLevel } from '../../../../../common/entity_analytics/risk_engine/risk_levels';
import {
  extractIsPrivileged,
  getAssetCriticality,
  getEntityAttributes,
  getEntityLifecycle,
  matchesPrivilegedWatchlist,
} from '../../../../lib/entity_analytics/lead_generation/observation_modules/utils';
import type { BriefCandidate, BriefPriority, EntityFacts } from './brief_types';
import { formatStoredValue } from './describe_scope';

/** As the Risk movers count: a change of at least this many points is worth a chart. */
const RISK_CHART_MIN_CHANGE = 10;

/** The risk the brief states for a candidate, and where its scores are stored. */
export interface CandidateRisk {
  of: 'entity' | 'resolution group';
  score: number;
  level: EntityRiskLevels;
  scoreType: 'base' | 'resolution';
  /** The id the risk scores are stored under: the golden entity's for a group, the record's own otherwise. */
  scoredId: string;
}

/**
 * Resolution first: a scored resolution group's risk, otherwise the entity's own. Used to rank, to state
 * risk and to chart it.
 */
export const getCandidateRisk = ({ id, record }: BriefCandidate): CandidateRisk | undefined => {
  const group = record.entity?.relationships?.resolution?.risk?.calculated_score_norm;
  if (group !== undefined && Number.isFinite(group)) {
    const level = record.entity?.relationships?.resolution?.risk?.calculated_level;
    return {
      of: 'resolution group',
      score: group,
      level: level ?? getRiskLevel(group),
      scoreType: 'resolution',
      scoredId: id,
    };
  }
  const own = record.entity?.risk?.calculated_score_norm;
  if (own === undefined || !Number.isFinite(own)) {
    return undefined;
  }
  return {
    of: 'entity',
    score: own,
    level: record.entity?.risk?.calculated_level ?? getRiskLevel(own),
    scoreType: 'base',
    scoredId: record.entity?.id ?? id,
  };
};

/**
 * What the model knows about each candidate. `riskAtStart` holds each candidate's score at the start of
 * the period, by candidate id; without it, the start is left out.
 */
export const buildFacts = (
  candidates: BriefCandidate[],
  scope: EntityAnalyticsScope,
  riskAtStart?: Map<string, number>
): EntityFacts[] =>
  candidates.map((candidate) => {
    const { id, name, type, tileIds } = candidate;
    const otherWatchlists = (getEntityAttributes(candidate)?.watchlists ?? []).filter(
      (watchlist) => !matchesPrivilegedWatchlist([watchlist])
    ).length;
    const firstSeen = getEntityLifecycle(candidate)?.first_seen;
    const criticality = getAssetCriticality(candidate);
    return {
      entityId: id,
      name,
      type,
      flaggedFor: tileIds,
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

/** The first priority whose risk moved by at least the Risk movers threshold. Only it gets a chart. */
export const getRiskChartEntityId = (
  priorities: BriefPriority[],
  facts: EntityFacts[]
): string | undefined =>
  priorities.find(({ entityId }) => {
    const change = facts.find((entity) => entity.entityId === entityId)?.risk?.change;
    return change !== undefined && Math.abs(change) >= RISK_CHART_MIN_CHANGE;
  })?.entityId;
