/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Prototype v.7 mock corpus — shared entities from v.2, counted inside the
 * preset window chosen in the KQL bar (24h / 7d / 30d).
 *
 * UI under `./` is an independent snapshot. Entity fixtures stay single-sourced
 * from `../v2/data`; window-facing values and labels are overridden here so
 * older prototypes keep their “Today” / 24h copy.
 *
 * The card helpers below deliberately share one membership set per card and
 * window (see `./signal_windows`): `getSignalCards` counts it for the tile
 * value, and the `filterIdentities` / `filterRawRecords` overrides filter the
 * Entities table by it. That is what keeps “Untriaged high-risk 5” and the five
 * rows you get after clicking that tile in agreement at every window.
 */

import type {
  ActiveFilter,
  AttentionEntry,
  FaceliftIdentity,
  FaceliftRawRecord,
  PageFilters,
  SignalCardData,
  SignalCardId,
  TableView,
} from '../v2/data';
import {
  EMPTY_PAGE_FILTERS,
  IDENTITIES,
  RAW_RECORDS,
  SIGNAL_CARDS as V2_SIGNAL_CARDS,
  attentionReasonsFor as attentionReasonsForV2,
  filterIdentities as filterIdentitiesV2,
  filterRawRecords as filterRawRecordsV2,
  getAttentionList as getAttentionListV2,
  identityMatchesPageFilters,
  recordMatchesPageFilters,
  recordsForIdentity,
} from '../v2/data';
import { getActiveTimeRange } from './active_time_range';
import { memberIdsInWindow } from './signal_windows';
import type { FaceliftTimeRangeId } from './time_range';
import { FACELIFT_TIME_RANGES, expandTrendToThirtyDays } from './time_range';

export * from '../v2/data';

/** Filter-pill copy per card, with the window spelled out where it reads well. */
const CARD_FILTER_LABELS: Partial<Record<SignalCardId, (windowLabel: string) => string>> = {
  untriagedHighRisk: (window) => `Untriaged high-risk ${window}`,
  newToCritical: (window) => `New to Critical ${window}`,
  riskMovers: (window) => `Risk movers (+20% ${window})`,
  newAndAlerting: (window) => `New and alerting ${window}`,
  newAnomalies: (window) => `New anomalies ${window}`,
  hiddenRisk: (window) => `Early warning ${window}`,
};

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
const cardPopulation = (cardId: SignalCardId): string[] =>
  filterIdentitiesV2({ type: 'card', cardId, label: '' })
    .filter((identity) => recordsForIdentity(identity.id).length > 0)
    .map((identity) => identity.id);

/** Entities whose signal for `cardId` landed inside the window. */
const cardMembers = (cardId: SignalCardId, range: FaceliftTimeRangeId): Set<string> =>
  memberIdsInWindow(cardPopulation(cardId), cardId, range);

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
