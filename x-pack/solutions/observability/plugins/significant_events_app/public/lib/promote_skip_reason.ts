/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PromoteResult } from '../hooks/use_queries_api';
import {
  NOT_FILTER_ONLY_PROMOTE_DISABLED,
  STATS_PROMOTE_DISABLED_TOOLTIP,
} from '../pages/significant_events/components/queries_table/translations';

/**
 * Why a promotion left queries behind, or `undefined` when it left none.
 *
 * Shared by the row and bulk promote flows so they cannot drift: the reasons
 * carry different remedies (rewrite the query vs wait for rule-on-rule
 * provisioning) and a caller that reports the wrong one leaves the user with
 * nothing to act on. Ineligible MATCH wins a tie because it is the reason the
 * user can do something about.
 */
export function getPromoteSkipReason({
  skipped_ineligible: skippedIneligible,
  skipped_stats: skippedStats,
}: PromoteResult): string | undefined {
  if (skippedIneligible > 0) {
    return NOT_FILTER_ONLY_PROMOTE_DISABLED;
  }
  if (skippedStats > 0) {
    return STATS_PROMOTE_DISABLED_TOOLTIP;
  }
  return undefined;
}
