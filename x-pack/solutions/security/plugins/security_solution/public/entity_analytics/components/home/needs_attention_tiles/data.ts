/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SIGNAL_CARD_IDS,
  type SignalCardId,
} from '../../../../../common/entity_analytics/home/constants';
import { isOneOf } from '../entities_grid/common';

export { SIGNAL_CARD_IDS, type SignalCardId };

export const isSignalCardId = (v: string | null): v is SignalCardId => isOneOf(SIGNAL_CARD_IDS, v);

/** Shared empty list so hooks do not allocate a new `[]` on every render. */
export const EMPTY_ENTITY_IDS: string[] = [];

/**
 * Why a tile can't show its count. `locked` says which read access is missing; `issue` shows "N/A"
 * and gives the reason in the row below it, with the explanation in a tooltip.
 */
export type TileCountIssue =
  | { kind: 'locked'; text: string }
  | {
      kind: 'issue';
      /** Why: a failure and a timeout each get one toast for the page. */
      cause: 'failed' | 'timedOut' | 'missing';
      icon: 'warning' | 'error';
      text: string;
      tooltip: string;
    };

/** Why a tile's change can't be shown even though history exists: the history check or the previous-period query failed. */
export type TileDeltaFailure = 'history' | 'delta';

export interface SignalCardData {
  id: SignalCardId;
  title: string;
  value: number;
  isLoading?: boolean;
  /**
   * True only when the count query returned a result. A failed, skipped, timed-out or no-access count
   * is false, so the tile shows a dash for it and "0" only for a genuine 0.
   */
  hasCount: boolean;
  /** Set when the count can't be shown; the tile says why in place of the value. */
  countIssue?: TileCountIssue;
  description: string;
  delta?: number;
  /** True while the delta query is in flight, to show a spinner in place of the badge number. */
  isDeltaLoading?: boolean;
  /** True while the sparkline's series loads: the tile shows the progress bar and no line. */
  isTrendLoading?: boolean;
  /** True when the history is too short to compare with the previous period: the tile says so. */
  isDeltaUnavailable?: boolean;
  /** Set when a query behind the change failed; the tile says it can't compare. */
  deltaFailure?: TileDeltaFailure;
  /** The entities the tile counts, as its query returns them. */
  entityIds?: readonly string[];
  /** True when the tile's query failed or can't run, so the value shown isn't a real count. */
  isUnavailable?: boolean;
  filterLabel: string;
  trend?: number[];
}
