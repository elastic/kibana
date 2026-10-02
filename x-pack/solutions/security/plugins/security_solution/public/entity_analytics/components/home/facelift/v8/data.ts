/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Prototype v.8 mock corpus — shared entities from v.2, counted inside the
 * preset window chosen in the KQL bar (24h / 7d / 30d).
 *
 * UI under `./` is an independent snapshot. Entity fixtures stay single-sourced
 * from `../v2/data`; window-facing values and labels are overridden here so
 * older prototypes keep their “Today” / 24h copy.
 *
 * The card helpers below deliberately share one membership set per card and
 * window (see `./signal_windows`): `getSignalCards` counts it for the tile
 * value, and the `filterIdentities` / `filterRawRecords` overrides filter the
 * Entities table by it. That is what keeps “Severely alerting 5” and the five
 * rows you get after clicking that tile in agreement at every window.
 *
 * v.8 also redefines what the cards mean (see {@link CARD_PREDICATES}); the
 * card ids are kept so the metrics folders, sparklines and deltas keyed on
 * them keep working.
 */

import type {
  ActiveFilter,
  AttentionEntry,
  FaceliftIdentity,
  FaceliftRawRecord,
  FaceliftRiskLevel,
  PageFilters,
  SignalCardData,
  SignalCardId,
  TableView,
} from '../v2/data';
import {
  EMPTY_PAGE_FILTERS,
  IDENTITIES,
  RAW_RECORDS,
  RISK_LEVELS,
  SIGNAL_CARDS as V2_SIGNAL_CARDS,
  anomaliesCountForIdentity,
  attentionReasonsFor as attentionReasonsForV2,
  filterIdentities as filterIdentitiesV2,
  filterRawRecords as filterRawRecordsV2,
  getAttentionList as getAttentionListV2,
  getFaceliftRiskLevel,
  identityMatchesPageFilters,
  recordMatchesPageFilters,
  recordsForIdentity,
  scoreDeltaPercent,
  watchlistsForIdentity,
} from '../v2/data';
import { getResolvedEntities as getResolvedEntitiesV2 } from '../v2/resolved_entities_data';
import { getActiveTimeRange } from './active_time_range';
import { memberIdsInWindow, riskPointsInWindow } from './signal_windows';
import type { FaceliftTimeRangeId } from './time_range';
import { FACELIFT_TIME_RANGES, expandTrendToThirtyDays } from './time_range';

export * from '../v2/data';

/** “Risk movers” threshold, as a percentage of the score before the move. */
export const RISK_MOVER_THRESHOLD_PERCENT = 10;

/** Filter-pill copy per card, with the window spelled out where it reads well. */
const CARD_FILTER_LABELS: Partial<Record<SignalCardId, (windowLabel: string) => string>> = {
  untriagedHighRisk: (window) => `Severely alerting ${window}`,
  newToCritical: (window) => `Newly high-risk ${window}`,
  riskMovers: (window) => `Risk movers (+${RISK_MOVER_THRESHOLD_PERCENT}% ${window})`,
  newAndAlerting: (window) => `New and alerting ${window}`,
  newAnomalies: (window) => `Anomalous ${window}`,
  hiddenRisk: (window) => `Watchlisted and alerting ${window}`,
};

// ---------------------------------------------------------------------------
// Card membership (v.8 definitions)
// ---------------------------------------------------------------------------

/** Low → high, so a level climb is a strictly larger index. */
const riskLevelRank = (level: FaceliftRiskLevel): number =>
  RISK_LEVELS.length - 1 - RISK_LEVELS.indexOf(level);

const isHighOrCritical = (level: FaceliftRiskLevel): boolean =>
  level === 'High' || level === 'Critical';

/**
 * Entities with at least one high- or critical-severity alert, read from the
 * same severity mix the Alerts column renders so the tile and the table can
 * never disagree about who is “severely alerting”.
 */
let severelyAlertingIds: Set<string> | undefined;
const hasSevereAlert = (identity: FaceliftIdentity): boolean => {
  if (!severelyAlertingIds) {
    severelyAlertingIds = new Set(
      getResolvedEntitiesV2()
        .filter((row) => !row.isUnresolved)
        .filter((row) => row.alertsBySeverity.critical + row.alertsBySeverity.high > 0)
        .map((row) => row.id)
    );
  }
  return severelyAlertingIds.has(identity.id);
};

/**
 * What each tile counts in v.8. Risk movers reads the move already narrowed to
 * the window, so the tile agrees with the Risk score change column; the other
 * cards are 30-day state that `./signal_windows` slices per window.
 */
const CARD_PREDICATES: Record<
  SignalCardId,
  (identity: FaceliftIdentity, range: FaceliftTimeRangeId) => boolean
> = {
  // Severely alerting — at least one high- or critical-severity alert.
  untriagedHighRisk: (identity) => identity.alerts > 0 && hasSevereAlert(identity),
  // Newly high-risk — risk level climbed into (or within) High / Critical.
  newToCritical: (identity) => {
    const now = getFaceliftRiskLevel(identity.riskScore);
    const before = getFaceliftRiskLevel(identity.riskScore - identity.riskDelta24h);
    return isHighOrCritical(now) && riskLevelRank(now) > riskLevelRank(before);
  },
  // Risk movers — score up by the threshold or more inside the window.
  riskMovers: (identity, range) =>
    scoreDeltaPercent(identity.riskScore, riskPointsInWindow(identity.riskDelta24h, range)) >=
    RISK_MOVER_THRESHOLD_PERCENT,
  // New & alerting — first seen in this period with at least one alert.
  newAndAlerting: (identity) => Boolean(identity.isNewThisWeek) && identity.alerts > 0,
  // Anomalous — flagged by at least one ML anomaly.
  newAnomalies: (identity) => anomaliesCountForIdentity(identity) > 0,
  // Watchlisted & alerting — on a watchlist with at least one alert.
  hiddenRisk: (identity) => watchlistsForIdentity(identity.id).length > 0 && identity.alerts > 0,
};

/** Cards whose predicate already applied the window, so no slicing is needed. */
const WINDOW_AWARE_CARDS: ReadonlySet<SignalCardId> = new Set<SignalCardId>(['riskMovers']);

/** Metric card fixtures with 30-day filter labels and daily sparkline points. */
export const SIGNAL_CARDS: SignalCardData[] = V2_SIGNAL_CARDS.map((card) => ({
  ...card,
  ...(card.trend ? { trend: expandTrendToThirtyDays(card.trend) } : {}),
  filterLabel:
    CARD_FILTER_LABELS[card.id]?.(FACELIFT_TIME_RANGES['30d'].windowLabel) ?? card.filterLabel,
}));

/**
 * Every entity that qualifies for a card and appears in the Entities table,
 * before page filters — the population the window slice is taken from.
 */
const cardPopulation = (cardId: SignalCardId, range: FaceliftTimeRangeId): string[] =>
  IDENTITIES.filter((identity) => CARD_PREDICATES[cardId](identity, range))
    .filter((identity) => recordsForIdentity(identity.id).length > 0)
    .map((identity) => identity.id);

/** Entities whose signal for `cardId` landed inside the window. */
const cardMembers = (cardId: SignalCardId, range: FaceliftTimeRangeId): Set<string> => {
  const population = cardPopulation(cardId, range);
  return WINDOW_AWARE_CARDS.has(cardId)
    ? new Set(population)
    : memberIdsInWindow(population, cardId, range);
};

/**
 * Metric cards for the active page filters, table view and preset window.
 *
 * Values stay live corpus counts so each tile still equals the row count after
 * Filter for / out (resolved identities, or raw records in Raw view); the
 * window only decides which entities are in scope.
 */
export const getSignalCards = (
  filters: PageFilters = EMPTY_PAGE_FILTERS,
  tableView: TableView = 'resolved',
  range: FaceliftTimeRangeId = getActiveTimeRange()
): SignalCardData[] => {
  const windowLabel = FACELIFT_TIME_RANGES[range].windowLabel;

  return V2_SIGNAL_CARDS.map((card) => {
    const members = cardMembers(card.id, range);

    const value =
      tableView === 'raw'
        ? RAW_RECORDS.filter(
            (record) =>
              record.resolvedTo != null &&
              members.has(record.resolvedTo) &&
              recordMatchesPageFilters(record, filters)
          ).length
        : IDENTITIES.filter(
            (identity) => members.has(identity.id) && identityMatchesPageFilters(identity, filters)
          ).length;

    return {
      ...card,
      value,
      filterLabel: CARD_FILTER_LABELS[card.id]?.(windowLabel) ?? card.filterLabel,
    };
  });
};

/**
 * Distinct entities on at least one metric card — the figure behind the
 * “N entities need your attention” heading.
 *
 * Deliberately not the sum of the tiles: an entity that is both severely
 * alerting and a risk mover appears on two cards, so adding the values up
 * could exceed the number of entities in the environment. Counting the union
 * of card membership keeps the heading bounded by the table.
 */
export const getEntitiesNeedingAttentionCount = (
  filters: PageFilters = EMPTY_PAGE_FILTERS,
  tableView: TableView = 'resolved',
  range: FaceliftTimeRangeId = getActiveTimeRange()
): number => {
  const onAnyCard = new Set<string>();
  for (const card of V2_SIGNAL_CARDS) {
    for (const id of cardMembers(card.id, range)) {
      onAnyCard.add(id);
    }
  }

  return tableView === 'raw'
    ? RAW_RECORDS.filter(
        (record) =>
          record.resolvedTo != null &&
          onAnyCard.has(record.resolvedTo) &&
          recordMatchesPageFilters(record, filters)
      ).length
    : IDENTITIES.filter(
        (identity) => onAnyCard.has(identity.id) && identityMatchesPageFilters(identity, filters)
      ).length;
};

/**
 * Card membership narrowed to the active window, so clicking a tile filters the
 * table to exactly the entities that tile counted. Other filter types keep v.2
 * behaviour.
 */
export const filterIdentities = (filter: ActiveFilter | null): FaceliftIdentity[] => {
  if (filter?.type !== 'card') {
    return filterIdentitiesV2(filter);
  }

  const members = cardMembers(filter.cardId, getActiveTimeRange());
  return filter.exclude
    ? IDENTITIES.filter((identity) => !members.has(identity.id))
    : IDENTITIES.filter((identity) => members.has(identity.id));
};

/** Raw-record counterpart of {@link filterIdentities}. */
export const filterRawRecords = (filter: ActiveFilter | null): FaceliftRawRecord[] => {
  if (filter?.type !== 'card') {
    return filterRawRecordsV2(filter);
  }

  const members = cardMembers(filter.cardId, getActiveTimeRange());
  return RAW_RECORDS.filter((record) => {
    if (record.resolvedTo == null) {
      return Boolean(filter.exclude);
    }
    const matches = members.has(record.resolvedTo);
    return filter.exclude ? !matches : matches;
  });
};

/** Attention badges follow the selected window instead of v.2's fixed 24h. */
export const attentionReasonsFor = (
  identity: FaceliftIdentity
): ReturnType<typeof attentionReasonsForV2> => {
  const windowLabel = FACELIFT_TIME_RANGES[getActiveTimeRange()].windowLabel;
  return attentionReasonsForV2(identity).map((reason) =>
    reason.label.endsWith(' in 24h')
      ? { ...reason, label: reason.label.replace(/ in 24h$/, ` ${windowLabel}`) }
      : reason
  );
};

export const getAttentionList = (filters: PageFilters = EMPTY_PAGE_FILTERS): AttentionEntry[] =>
  getAttentionListV2(filters).map((entry) => ({
    ...entry,
    reasons: attentionReasonsFor(entry.identity),
  }));
