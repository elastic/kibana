/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { PND_WATCH_WORKFLOW_IDS } from '@kbn/pnd-common';
import type { HitlWaitStepType } from '@kbn/workflows';
import { WORKFLOWS_STEP_EXECUTIONS_INDEX } from '@kbn/workflows-management-plugin/common';

import { PND_ACTIVITY_STEP_IDS } from '../resolve_activity_action';
import { resolveActivityWindow } from '../resolve_activity_window';

/** The step type every PND gate is; a mapped keyword on `.workflows-step-executions`. */
const PND_GATE_STEP_TYPE: HitlWaitStepType = 'waitForInput';

export interface BuildActivityQueryParams {
  /** Epoch milliseconds the series is anchored on. */
  now: number;
  /** Space resolved from the request (security finding S9); never a client value, never `'*'`. */
  spaceId: string;
}

/**
 * The 24-hour gates-opened-per-hour aggregation behind `GET /internal/pnd/proposals/activity`.
 *
 * Every clause here is one of the four mitigations that make the `asInternalUser` read acceptable
 * — see the route's own comment — so none of them is optional and none may be widened:
 *
 * - the caller's space, and only it (mitigation 3);
 * - the PND watch workflow ids **and** the four registry step ids (mitigation 2), which together
 *   are strictly narrower than "any workflow alive in this space";
 * - `size: 0` with no `_source` (mitigation 4), so only bucket counts leave the server.
 *
 * `ignore_unavailable` covers a cluster where no workflow has ever run and the index therefore
 * does not exist yet: a brand-new deployment should draw a flat sparkline, not an error.
 */
export const buildActivityQuery = ({
  now,
  spaceId,
}: BuildActivityQueryParams): estypes.SearchRequest => {
  const { end, start } = resolveActivityWindow(now);

  return {
    aggs: {
      by_hour: {
        aggs: {
          // G4: the category is not a mapped field, so the hour is split by step id and joined to
          // the gate registry in JS by `resolveActivityAction`.
          by_step_id: { terms: { field: 'stepId', size: PND_ACTIVITY_STEP_IDS.length } },
        },
        date_histogram: {
          extended_bounds: { max: end, min: start },
          field: 'startedAt',
          fixed_interval: '1h',
          min_doc_count: 0,
        },
      },
    },
    ignore_unavailable: true,
    index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
    query: {
      bool: {
        filter: [
          { term: { spaceId } },
          { term: { stepType: PND_GATE_STEP_TYPE } },
          { terms: { workflowId: [...PND_WATCH_WORKFLOW_IDS] } },
          { terms: { stepId: [...PND_ACTIVITY_STEP_IDS] } },
          // The window's own oldest hour rather than a literal `now-24h`: the two differ by less
          // than an hour, and starting on a boundary is what keeps the histogram at 24 buckets.
          { range: { startedAt: { gte: start } } },
        ],
      },
    },
    size: 0,
    track_total_hits: false,
  };
};
