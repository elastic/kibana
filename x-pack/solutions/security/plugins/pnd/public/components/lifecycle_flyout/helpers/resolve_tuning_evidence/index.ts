/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndProposalRow } from '@kbn/pnd-common';

import type { PndTuningPreview } from '../../../backtest_comparison';
import type { PndTunableRuleChange } from '../../../proposed_rule_change';
import { readTuningEvidence } from '../../../lifecycle_view';
import { parseTuningProposal } from '../../../../pages/conversations/helpers/parse_tuning_proposal';
import type { TuningRecoverySource } from '../../../../pages/conversations/helpers/parse_tuning_proposal';

export interface ResolvedTuningEvidence {
  change?: PndTunableRuleChange;
  /**
   * The rule's query as it stands, so a proposed rewrite reads as a diff rather than as a string on
   * its own. Parsed-only, like `ruleName`: `PndProposalRow` has no field for it, and the watch writes
   * it into the reasoning from the rule it fetched.
   */
  currentQuery?: string;
  preview?: PndTuningPreview;
  reasoning?: string;
  /** Which carrier the rule and change came out of; never presented as more than it is. */
  recovery: TuningRecoverySource;
  ruleId?: string;
  ruleName?: string;
}

/**
 * Everything the Review tuning section renders about one `await_apply_tuning` proposal, or `undefined`
 * when no such gate is waiting.
 *
 * **The row alone is not enough, and that is a finding rather than an oversight** (R6). Nothing in
 * `pnd/server` reads `draft_tuning.output.structured_output`: the workflow flattens its own
 * structured output into the gate's `reasoning` prose, so `PndProposalRow` carries no `change`, no
 * `ruleId` and no `ruleName`, and its declared `preview` has no producer anywhere. Rendering
 * `readTuningEvidence` on its own therefore shows an empty proposed change and "no backtest
 * available" for a perfectly healthy proposal.
 *
 * So the row is read first and the reasoning is parsed for whatever it did not carry — the same
 * `evidence.X ?? parsed.X` order `TuningApprovalDialog` uses, which is what keeps the tab and the
 * dialog from disagreeing about what is being approved. The row wins wherever it has an answer,
 * because a contract field is the workflow's own output while a parsed one was recovered from text.
 *
 * `recovery` is carried through rather than dropped: a rule id read out of pre-v4 prose is not as
 * trustworthy as one the workflow wrote as JSON, and the difference should stay visible to whatever
 * renders it.
 *
 * This is the **single** merge point: the Review tuning section and `TuningApprovalDialog` both resolve
 * through it, so a query rewrite and its backtest cannot be described one way on the row and another
 * way in the dialog that authorizes the write.
 */
export const resolveTuningEvidence = (
  proposal: PndProposalRow | undefined
): ResolvedTuningEvidence | undefined => {
  if (proposal == null) {
    return undefined;
  }

  const evidence = readTuningEvidence(proposal);
  const parsed = parseTuningProposal({
    message: proposal.message,
    reasoning: proposal.reasoning,
  });

  const change = evidence.change ?? parsed.change;
  const preview = evidence.preview ?? parsed.preview;
  const ruleId = evidence.ruleId ?? parsed.ruleId;

  return {
    ...(change != null ? { change } : {}),
    ...(parsed.currentQuery != null ? { currentQuery: parsed.currentQuery } : {}),
    ...(preview != null ? { preview } : {}),
    ...(evidence.reasoning != null ? { reasoning: evidence.reasoning } : {}),
    ...(ruleId != null ? { ruleId } : {}),
    ...(parsed.ruleName != null ? { ruleName: parsed.ruleName } : {}),
    recovery: parsed.recovery,
  };
};
