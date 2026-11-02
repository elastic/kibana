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
  /** Short hint shown in place of the value when value is 0, e.g. which index needs data. */
  noDataMessage?: string;
  description: string;
  delta?: number;
  /** True while the delta query is in flight, to show a spinner in place of the badge number. */
  isDeltaLoading?: boolean;
  /** True when the history is too short to compare with the previous period: the tile says so. */
  isDeltaUnavailable?: boolean;
  /** The entities the tile counts, as its query returns them. */
  entityIds?: readonly string[];
  /** True when the tile's query failed or can't run, so the value shown isn't a real count. */
  isUnavailable?: boolean;
  filterLabel: string;
  trend?: number[];
}
