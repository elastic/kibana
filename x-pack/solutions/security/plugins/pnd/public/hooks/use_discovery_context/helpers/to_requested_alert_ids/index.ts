/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_DISCOVERY_CONTEXT_MAX_ALERT_IDS } from '@kbn/pnd-common';

/**
 * The Attack Discovery ids `GET /internal/pnd/discovery-context` should actually be asked for, from
 * the ids the proposals on screen carry.
 *
 * Three things happen here, and each of them has to happen before the request rather than inside it:
 *
 * - **Empty ids go.** An uncorrelated run carries `''` — never a missing property — and has no
 *   constituent alerts to aggregate, so it can contribute nothing to a blast radius.
 * - **Duplicates go.** Several proposals of one discovery are one enrichment.
 * - **The count is capped.** The route answers 400 above
 *   {@link PND_DISCOVERY_CONTEXT_MAX_ALERT_IDS}, and the query codec cannot enforce it: a bounded
 *   `in: query` array generates `ArrayFromString(...).max(n)`, and `ArrayFromString` has no `.max`.
 *
 * Sorting is not cosmetic. The result is the react-query key, so the same set of proposals in another
 * order has to be the same key — otherwise re-ordering the queue would silently refetch.
 */
export const toRequestedAlertIds = (correlationIds: readonly string[]): string[] =>
  [...new Set(correlationIds.filter((id) => id.length > 0))]
    .sort()
    .slice(0, PND_DISCOVERY_CONTEXT_MAX_ALERT_IDS);
