/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { PND_TUNING_CANDIDATE_RULES_MAX } from '@kbn/pnd-common';

import { PND_ALERTS_INDEX_BASE } from '../../../../../../common/constants';

/** Name the `terms` aggregation is addressed by in the response. */
export const PND_CANDIDATE_RULES_AGG_NAME = 'by_rule';

export interface BuildCandidateRulesQueryParams {
  /** Ids of the discovery's constituent detection alerts, already deduped and count-bounded. */
  alertIds: readonly string[];
  /** Space resolved from the request (security finding S9); never a client value, never `'*'`. */
  spaceId: string;
}

/**
 * The single aggregation behind `GET /internal/pnd/tuning/candidate-rules`.
 *
 * One `terms` bucket per distinct `kibana.alert.rule.uuid` across the discovery's constituent alerts.
 * The field is the rule's **saved-object** id — measured on a live alert, `kibana.alert.rule.uuid`
 * is the id `_apply` patches while `kibana.alert.rule.rule_id` is the human-authored one (bead
 * `kibana-0fph`) — so aggregating on it is what makes the resulting menu directly appliable.
 *
 * `size` is `PND_TUNING_CANDIDATE_RULES_MAX`, which is not a display cap: each bucket costs one
 * scoped read of the rules API, so the aggregation size *is* the fan-out bound.
 *
 * The rule's own fields are deliberately **not** taken from the alert document, even though
 * `kibana.alert.rule.parameters` carries a copy. That copy is the rule as it was when the alert
 * fired, and a `query` tuning must be diffed against the rule's *current* query — a diff against a
 * stale snapshot would propose a change that has already been made, or undo one.
 *
 * `ignore_unavailable` covers a space in which no detection rule has ever fired and the alerts index
 * therefore does not exist: an empty menu is the honest answer there, not an error.
 */
export const buildCandidateRulesQuery = ({
  alertIds,
  spaceId,
}: BuildCandidateRulesQueryParams): estypes.SearchRequest => ({
  aggs: {
    [PND_CANDIDATE_RULES_AGG_NAME]: {
      terms: { field: 'kibana.alert.rule.uuid', size: PND_TUNING_CANDIDATE_RULES_MAX },
    },
  },
  ignore_unavailable: true,
  index: `${PND_ALERTS_INDEX_BASE}-${spaceId}`,
  query: { ids: { values: [...alertIds] } },
  size: 0,
  track_total_hits: false,
});
