/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UNTITLED_TIMELINE } from '../open_timeline/translations';
import type { OpenTimelineResult } from '../open_timeline/types';
import type { SkippedQueryReason } from './build_super_timeline_model';

export interface UnmergeableSelection {
  title: string;
  reason: SkippedQueryReason;
}

/**
 * Returns the subset of selected timeline rows whose query type cannot be merged
 * into a Super Timeline (ES|QL and EQL are not supported).
 *
 * Classification precedence mirrors build_super_timeline_model.ts:161-163:
 *   - savedSearchId != null  → 'esql'  (checked first — an ES|QL timeline can also carry stale filters)
 *   - queryType.hasEql       → 'eql'
 *
 * `queryType` is derived from the list response; treat its absence as mergeable so that
 * an unexpected undefined never breaks the gate.
 */
export const getUnmergeableSelections = (items: OpenTimelineResult[]): UnmergeableSelection[] => {
  const result: UnmergeableSelection[] = [];

  for (const item of items) {
    const title = item.title ?? UNTITLED_TIMELINE;

    if (item.savedSearchId != null) {
      result.push({ title, reason: 'esql' });
    } else if (item.queryType?.hasEql === true) {
      result.push({ title, reason: 'eql' });
    }
  }

  return result;
};
