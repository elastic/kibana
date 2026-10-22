/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues, omit, upperFirst } from 'lodash';
import type { TimeRange } from '../../../../../common/entity_analytics/home/constants';
import type {
  EntityAnalyticsScope,
  EntityAnalyticsScopeTile,
} from '../../../../../common/entity_analytics/ai_brief/scope';
import type { CandidateEntities } from './read_entities';

export const BRIEF_PERIOD_LABELS: Record<TimeRange, string> = {
  '24h': '24 hours',
  '7d': '7 days',
  '30d': '30 days',
};

const HOUR_MS = 3_600_000;
const PERIOD_MS: Record<TimeRange, number> = {
  '24h': 24 * HOUR_MS,
  '7d': 7 * 24 * HOUR_MS,
  '30d': 30 * 24 * HOUR_MS,
};

/** The start of the captured period, which ends at `capturedAt`. */
export const getPeriodStart = ({ capturedAt, period }: EntityAnalyticsScope): Date =>
  new Date(new Date(capturedAt).getTime() - PERIOD_MS[period]);

/** A tile's change as the page shows it, where the period is already named: `+3` or `no change`. */
export const describeDelta = ({ delta }: EntityAnalyticsScopeTile): string => {
  if (delta === undefined) {
    return 'not enough history';
  }
  if (delta === 0) {
    return 'no change';
  }
  return `${delta > 0 ? '+' : ''}${formatCount(delta)}`;
};

const ENTITY_FILTER_LABELS: Record<string, string> = {
  entityTypes: 'Entity type',
  riskLevels: 'Risk level',
  assetCriticality: 'Asset criticality',
  dataSources: 'Data source',
};

/** An entity filter as the filter bar labels it. Watchlist values are ids, so only their count is stated. */
export const describeEntityFilter = (key: string, values: readonly string[]): string => {
  if (key === 'watchlists') {
    return `On ${formatCountOf(values.length, 'selected watchlist', 'selected watchlists')}`;
  }
  return `${ENTITY_FILTER_LABELS[key] ?? key}: ${values.map(formatStoredValue).join(', ')}`;
};

export const formatCount = (count: number): string => count.toLocaleString('en-US');

export const formatCountOf = (count: number, one: string, many: string): string =>
  `${formatCount(count)} ${count === 1 ? one : many}`;

/** A stored value as the page shows it: `extreme_impact` as "Extreme impact". */
export const formatStoredValue = (value: string): string => upperFirst(value.replace(/_/g, ' '));

/** Only when a cap left out flagged entities: the brief, and the model, are told it is a sample. */
export const describeSample = (
  { tiles }: EntityAnalyticsScope,
  { candidates, readCount, isTruncated }: CandidateEntities
): string | undefined => {
  const available = Object.values(tiles).filter(({ unavailable }) => !unavailable);
  // A tile that sent fewer ids than its value makes the total a lower bound.
  const isSampled = available.some(({ value, entityIds }) => entityIds.length < value);
  if (!isSampled && !isTruncated) {
    return undefined;
  }
  // The largest count, never a sum: the tiles overlap.
  const total = Math.max(readCount, ...available.map(({ value }) => value));
  return `Based on the ${formatCount(candidates.length)} highest-ranked of ${
    isSampled ? 'at least ' : ''
  }${formatCountOf(total, 'flagged entity', 'flagged entities')}.`;
};

/** The captured view for the agent's follow-up questions, without the entity ids. */
export const describeScopeForAgent = (attachmentId: string, scope: EntityAnalyticsScope): string =>
  JSON.stringify({
    attachmentId,
    ...scope,
    tiles: mapValues(scope.tiles, (tile) => tile && omit(tile, 'entityIds')),
  });
