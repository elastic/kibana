/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { UseMutationResult } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { API_VERSIONS, buildTuningApplyUrl } from '@kbn/pnd-common';
import type { ApplyTuningResponse } from '@kbn/pnd-common';

import type { PndTunableRuleChange } from '../../components/proposed_rule_change';
import { queryKeys } from '../../query_keys';

export interface ApplyTuningParams {
  /**
   * The detection-rule change to apply.
   *
   * Typed as the **permissive** superset rather than the generated
   * `PndTuningChange`, on purpose: a model-authored change really can name a field
   * outside `PND_TUNABLE_RULE_FIELDS`, and the boundary that rejects it has to be
   * the server (the request schema strips it, and `_apply`'s allow-list answers
   * **400**). Narrowing it here would drop an unsafe proposal silently on the way
   * out instead of surfacing it — and an unsafe proposal is a finding worth
   * reporting, not a transient error to retry.
   */
  change: PndTunableRuleChange;
  /**
   * The Attack Discovery alert id the tuning belongs to, which is what addresses
   * the proposal in the route path. A gate PND could not correlate to a discovery
   * carries `''`, so the caller substitutes its `sourceId` rather than building a
   * url with an empty path segment.
   */
  proposalId: string;
  /** Mandatory and non-empty after trim, exactly as on `_respond`. */
  rationale: string;
  /**
   * Sent as `id` — the detection rule's saved-object id, the field
   * `draft_tuning` authors and the dialog prefills. `_apply` also accepts
   * `rule_id`, but a single field cannot be both, and `id` is the one the
   * approval dialog names.
   */
  ruleId: string;
}

/**
 * `POST /internal/pnd/tuning/{proposalId}/_apply` — the write that ends the loop.
 *
 * This is the second of the two calls a `tune` approval makes: `_respond` resumes
 * the gate, and this changes the detection rule. It runs in the **approving
 * user's** request context, which is the whole point of the route existing (S2) —
 * the Task Manager API key that ran the Detection Watch belongs to whoever
 * scheduled it, not to the engineer who approved this.
 *
 * Deliberately **not** retried: it is a write, and `retryOnTransientError` on a
 * rule patch would re-apply it. And no cache is invalidated on failure — a 403
 * says nothing about what a rule now looks like. On success the executions
 * projection is invalidated, because the four-phase flyout's phase-4 rows change
 * the moment the tuning lands.
 */
export const useApplyTuning = (): UseMutationResult<
  ApplyTuningResponse,
  unknown,
  ApplyTuningParams
> => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      change,
      proposalId,
      rationale,
      ruleId,
    }: ApplyTuningParams): Promise<ApplyTuningResponse> => {
      const trimmedRationale = rationale.trim();
      const trimmedRuleId = ruleId.trim();

      if (trimmedRationale.length === 0) {
        throw new Error('a non-empty rationale is required');
      }

      if (trimmedRuleId.length === 0) {
        throw new Error('a rule id is required');
      }

      return services.http!.post<ApplyTuningResponse>(buildTuningApplyUrl(proposalId), {
        body: JSON.stringify({ change, id: trimmedRuleId, rationale: trimmedRationale }),
        version: API_VERSIONS.internal.v1,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.executions.all });
    },
  });
};
