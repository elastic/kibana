/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Prototype v.6 mock corpus — shared entities from v.2 with Last-30-days framing.
 *
 * UI under `./` is an independent snapshot. Entity fixtures stay single-sourced
 * from `../v2/data`; timeframe-facing labels / trends are overridden here so
 * older prototypes keep “Today” / 24h copy.
 */

import type { AttentionEntry, FaceliftIdentity, PageFilters, SignalCardData, TableView } from '../v2/data';
import {
  EMPTY_PAGE_FILTERS,
  SIGNAL_CARDS as V2_SIGNAL_CARDS,
  attentionReasonsFor as attentionReasonsForV2,
  getAttentionList as getAttentionListV2,
  getSignalCards as getSignalCardsV2,
} from '../v2/data';
import { expandTrendToThirtyDays } from './time_range';

export * from '../v2/data';

/** Metric card fixtures with 30-day filter labels and daily sparkline points. */
export const SIGNAL_CARDS: SignalCardData[] = V2_SIGNAL_CARDS.map((card) => {
  const withTrend = card.trend
    ? { ...card, trend: expandTrendToThirtyDays(card.trend) }
    : { ...card };

  switch (card.id) {
    case 'newToCritical':
      return {
        ...withTrend,
        filterLabel: 'New to Critical in last 30 days',
      };
    case 'riskMovers':
      return {
        ...withTrend,
        description: 'Entities with risk spike 20% or more over 30 days',
        filterLabel: 'Risk movers (+20% in 30d)',
      };
    case 'newAndAlerting':
      return {
        ...withTrend,
        description: 'Entities first seen in the last 30 days that are already alerting',
        filterLabel: 'New in last 30 days and alerting',
      };
    default:
      return withTrend;
  }
});

/**
 * Same live corpus counts as v.2, but uses v.6 {@link SIGNAL_CARDS} so filter
 * pills and scaled trends follow the Last-30-days framing.
 */
export const getSignalCards = (
  filters: PageFilters = EMPTY_PAGE_FILTERS,
  tableView: TableView = 'resolved'
): SignalCardData[] => {
  const live = getSignalCardsV2(filters, tableView);
  const byId = new Map(SIGNAL_CARDS.map((card) => [card.id, card]));

  return live.map((card) => {
    const framed = byId.get(card.id);
    if (!framed) {
      return card;
    }
    return {
      ...card,
      description: framed.description,
      filterLabel: framed.filterLabel,
      ...(framed.trend
        ? {
            trend: framed.trend.map((value) => {
              const baseline = framed.value > 0 ? framed.value : 1;
              const ratio = card.value / baseline;
              return Math.round(value * ratio);
            }),
          }
        : {}),
    };
  });
};

/** Attention badges use 30d wording instead of 24h. */
export const attentionReasonsFor = (
  identity: FaceliftIdentity
): ReturnType<typeof attentionReasonsForV2> =>
  attentionReasonsForV2(identity).map((reason) =>
    reason.label.endsWith(' in 24h')
      ? { ...reason, label: reason.label.replace(/ in 24h$/, ' in 30d') }
      : reason
  );

export const getAttentionList = (
  filters: PageFilters = EMPTY_PAGE_FILTERS
): AttentionEntry[] =>
  getAttentionListV2(filters).map((entry) => ({
    ...entry,
    reasons: attentionReasonsFor(entry.identity),
  }));
