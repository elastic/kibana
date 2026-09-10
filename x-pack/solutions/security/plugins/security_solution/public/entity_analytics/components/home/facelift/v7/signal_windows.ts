/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Mocked recency of the events behind each overview metric and each table row.
 *
 * The shared corpus in `../v2/data` decides card membership from entity state
 * (`isNewToCritical`, risk delta, anomaly flags…), stores one figure per
 * entity for alerts/anomalies/cases, and carries no per-event timestamp — so
 * there is nothing real to compare a preset window against. This module
 * invents that missing dimension in two ways:
 *
 * - Membership (cards): put a card's members in a stable order and treat the
 *   leading slice as "triggered inside the window".
 * - Volume (columns): read each corpus figure as the 30-day total and scale it
 *   down for the narrower windows.
 *
 * Both are anchored at 30 days, which is the default preset, so the page the
 * prototype opens on shows the corpus untouched.
 *
 * Two properties make this behave like real data:
 * - Nested windows — the shares only grow with the window, so 24h ⊆ 7d ⊆ 30d
 *   and nothing can grow as the window shrinks.
 * - Stable membership — the slice order comes from a hash of entity id + card
 *   id, so a given entity always drops out of the same windows across
 *   re-renders and page reloads.
 *
 * Slicing (rather than sampling independently per card) also guarantees every
 * card keeps at least one member, so no tile collapses to its zero state.
 */

import type { SignalCardId } from '../v2/data';
import type { FaceliftTimeRangeId } from './time_range';

/** Share of a card's 30-day members whose signal landed inside each window. */
const WINDOW_MEMBER_SHARE: Record<FaceliftTimeRangeId, number> = {
  '24h': 0.5,
  '7d': 0.8,
  '30d': 1,
};

/**
 * Share of an entity's 30-day alerts / anomalies / case attachments that
 * landed inside each window. Front-loaded rather than proportional to elapsed
 * time — a day holds a quarter of the month's alerts, not a thirtieth —
 * because this corpus is written as a set of currently active entities.
 */
const WINDOW_VOLUME_SHARE: Record<FaceliftTimeRangeId, number> = {
  '24h': 0.25,
  '7d': 0.6,
  '30d': 1,
};

/**
 * Share of an entity's 30-day risk movement that happened inside each window.
 * Much flatter than the volume share: the risk engine weights recent activity,
 * so a score that climbed over a month did most of its climbing lately.
 *
 * Keep it flat enough that every mover in the corpus still clears 20% at 24h —
 * the Risk movers tile promises "+20%" and the table renders the same figure
 * in its Risk score change column, so a steeper curve would have rows
 * contradicting the tile that filtered to them.
 */
const WINDOW_RISK_MOVE_SHARE: Record<FaceliftTimeRangeId, number> = {
  '24h': 0.75,
  '7d': 0.9,
  '30d': 1,
};

/** FNV-1a — small, dependency-free and stable across reloads. */
const hashOf = (value: string): number => {
  /* eslint-disable no-bitwise -- the xor and unsigned shift are the hash itself */
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
  /* eslint-enable no-bitwise */
};

/**
 * Narrow a card's full (30-day) member ids to those whose signal falls inside
 * `range`. Returns a set so callers can filter identities or raw records
 * against the same membership decision.
 */
export const memberIdsInWindow = (
  memberIds: string[],
  cardId: SignalCardId,
  range: FaceliftTimeRangeId
): Set<string> => {
  if (range === '30d' || memberIds.length === 0) {
    return new Set(memberIds);
  }

  const byRecency = [...memberIds].sort(
    (a, b) => hashOf(`${a}:${cardId}`) - hashOf(`${b}:${cardId}`)
  );
  const kept = Math.max(1, Math.round(byRecency.length * WINDOW_MEMBER_SHARE[range]));

  return new Set(byRecency.slice(0, kept));
};

/**
 * Narrow a 30-day event count to `range`.
 *
 * `keepAtLeastOne` holds the result at 1 for an entity that has any events at
 * all, so a row can never read "no alerts"/"no anomalies" in a window where a
 * metric card is still counting it as alerting or anomalous. Cases have no
 * card behind them and are allowed to reach zero.
 */
export const countInWindow = (
  thirtyDayCount: number,
  range: FaceliftTimeRangeId,
  { keepAtLeastOne }: { keepAtLeastOne: boolean }
): number => {
  if (range === '30d' || thirtyDayCount <= 0) {
    return thirtyDayCount;
  }

  const scaled = Math.round(thirtyDayCount * WINDOW_VOLUME_SHARE[range]);
  return keepAtLeastOne ? Math.max(1, scaled) : scaled;
};

/**
 * Narrow a 30-day risk move (in score points) to `range`, keeping its
 * direction so entities that cooled off still read as cooling off.
 */
export const riskPointsInWindow = (thirtyDayPoints: number, range: FaceliftTimeRangeId): number =>
  range === '30d' ? thirtyDayPoints : Math.round(thirtyDayPoints * WINDOW_RISK_MOVE_SHARE[range]);
