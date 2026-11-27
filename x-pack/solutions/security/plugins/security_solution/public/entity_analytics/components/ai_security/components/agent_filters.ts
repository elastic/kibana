/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WatchlistLookup } from '../hooks/use_watchlist_lookup';
import type { AgentInventoryRow } from '../types';
import { getAccountEmails, getAccountLabel } from '../utils';

export const AI_AGENT_TILE_IDS = [
  'unsanctioned',
  'personWatchlists',
  'highImpactHosts',
  'newInstalls',
  'runsUnattended',
] as const;
export type AiAgentTileId = (typeof AI_AGENT_TILE_IDS)[number];

export const NEW_INSTALL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const HIGH_IMPACT_LEVELS: readonly string[] = ['high_impact', 'extreme_impact'];

export interface TileContext {
  readonly unsanctionedWatchlistId: string;
  readonly now: number;
}

export const isUnsanctioned = (
  { watchlistIds }: Pick<AgentInventoryRow, 'watchlistIds'>,
  unsanctionedWatchlistId: string
): boolean => watchlistIds.includes(unsanctionedWatchlistId);

/** Whether an install is one of the tile's: the tile's count and its table filter. */
export const matchesTile = (
  tileId: AiAgentTileId,
  row: AgentInventoryRow,
  { unsanctionedWatchlistId, now }: TileContext
): boolean => {
  switch (tileId) {
    case 'unsanctioned':
      return isUnsanctioned(row, unsanctionedWatchlistId);
    case 'personWatchlists':
      return (row.storeContext?.personWatchlistIds.length ?? 0) > 0;
    case 'highImpactHosts':
      return HIGH_IMPACT_LEVELS.includes(row.storeContext?.hostCriticality ?? '');
    case 'newInstalls': {
      const firstSeen = row.firstSeen ? new Date(row.firstSeen).getTime() : NaN;
      return Number.isFinite(firstSeen) && now - firstSeen <= NEW_INSTALL_WINDOW_MS;
    }
    case 'runsUnattended':
      return (row.activityProfile?.unattendedSessions ?? 0) > 0;
  }
};

/** Sort value for "Sessions (30d)": rows the activity maintainer hasn't reached sort below 0. */
export const getSessionsSortValue = ({
  activityProfile,
}: Pick<AgentInventoryRow, 'activityProfile'>): number => activityProfile?.sessions ?? -1;

const pad = (value: number, length: number): string =>
  String(Math.max(0, Math.round(value))).padStart(length, '0');

/**
 * Sort value for "Agent risk": the score, then open alerts, then last seen, so the many installs
 * with no score still come out in a useful order. Rows with no score sort below a score of 0.
 */
export const getAgentRiskSortValue = ({
  riskScore,
  alertCount,
  lastSeen,
}: Pick<AgentInventoryRow, 'riskScore' | 'alertCount' | 'lastSeen'>): string => {
  const lastSeenMs = lastSeen ? new Date(lastSeen).getTime() : 0;
  return [
    pad(riskScore == null ? 0 : riskScore * 100 + 1, 6),
    pad(alertCount, 7),
    pad(Number.isFinite(lastSeenMs) ? lastSeenMs : 0, 15),
  ].join('|');
};

/** Everything the page search matches: agent, host, OS user, people, emails and watchlists. */
export const getSearchText = (row: AgentInventoryRow, watchlistLookup: WatchlistLookup): string =>
  [
    row.agentName,
    row.hostName,
    row.hostId,
    row.userName,
    ...row.accountEmails,
    ...row.accounts.flatMap((account) => [getAccountLabel(account), ...getAccountEmails(account)]),
    ...watchlistLookup(row.watchlistIds).map(({ name }) => name),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

/** Rows whose search text holds every word of the query. */
export const filterBySearch = (
  rows: readonly AgentInventoryRow[],
  query: string,
  watchlistLookup: WatchlistLookup
): readonly AgentInventoryRow[] => {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return rows;
  return rows.filter((row) => {
    const text = getSearchText(row, watchlistLookup);
    return words.every((word) => text.includes(word));
  });
};
