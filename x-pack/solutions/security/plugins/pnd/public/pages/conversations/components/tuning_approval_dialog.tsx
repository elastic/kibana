/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiCallOut, EuiSpacer, EuiSwitch, EuiText } from '@elastic/eui';
import type { EuiSwitchEvent } from '@elastic/eui';
import type { PndProposalRow } from '@kbn/pnd-common';

import { BacktestComparison } from '../../../components/backtest_comparison';
// the helper directly rather than the `lifecycle_flyout` barrel: that barrel re-exports the whole
// overlay, and this dialog needs only the merge point both surfaces resolve through
import { resolveTuningEvidence } from '../../../components/lifecycle_flyout/helpers/resolve_tuning_evidence';
import { ProposedRuleChange } from '../../../components/proposed_rule_change';
import type { PndTunableRuleChange } from '../../../components/proposed_rule_change';
import { QueryComparison } from '../../../components/query_comparison';
import { RuleIdConfirmDialog } from '../../../components/rule_id_confirm_dialog';
import * as i18n from '../translations';

export interface TuningApprovalConfirmation {
  change: PndTunableRuleChange;
  rationale: string;
  ruleId: string;
}

export interface TuningApprovalDialogProps {
  /** A server error from `_respond` or `_apply`, shown in place. */
  errorMessage?: string;
  /**
   * The rationale the analyst gave in the approval modal, which opens **before** this dialog.
   *
   * Carried forward rather than asked for again: approving a tuning is one decision the analyst has
   * already explained, and it is the same rationale that goes to `_respond` and to `_apply`. Asking
   * twice would read as the first answer having been discarded.
   */
  initialRationale?: string;
  isLoading?: boolean;
  onCancel: () => void;
  onConfirm: (confirmation: TuningApprovalConfirmation) => void;
  proposal: PndProposalRow;
}

/**
 * The one approval in PND that writes to a production detection rule.
 *
 * It says exactly what will change before it changes it: the rule by name and id,
 * the change itself in human terms, the rewritten query beside the query it replaces
 * when the tuning is a query change, and the before/after backtest — or an explicit
 * "no backtest available", because a silent absence reads as "no change expected",
 * which is the opposite of the truth.
 *
 * Two facts shape it. The rule id is **model-authored**, so it is prefilled into an
 * editable field rather than trusted: `_apply` would otherwise 404 live on a rule
 * the model invented, and editing it is also the object model's "Modify"
 * affordance. And `PndProposalRow` carries no structured `ruleId`/`change` yet, so
 * both are recovered from the summary the workflow wrote.
 *
 * That recovery is **not** done here: it goes through {@link resolveTuningEvidence}, the one merge
 * point the Review tuning section resolves through too. Duplicating the `evidence.X ?? parsed.X` order
 * inline is how the two surfaces drift into describing the same proposal differently, and the one
 * that drifts here is the one that writes to the rule.
 *
 * When nothing machine-readable could be recovered, the dialog does **not** send an
 * empty change and call it applied. It offers the one change that is visible,
 * explainable and reversible on stage — enable or disable — and says plainly that
 * the analyst is authoring it. Widening that set to make a demo work is exactly
 * what the plan forbids.
 *
 * Finding R6: *how* the fields were obtained is stated rather than hidden. A row
 * parked by a pre-v4 Detection Watch has no machine-readable evidence to read, so its
 * rule name and id come from pattern-matching prose — a materially weaker basis for a
 * write to a production rule, and the approver is told so instead of being left to
 * assume the workflow wrote them as data.
 */
export const TuningApprovalDialog: React.FC<TuningApprovalDialogProps> = ({
  errorMessage,
  initialRationale,
  isLoading = false,
  onCancel,
  onConfirm,
  proposal,
}) => {
  const [isDisableRule, setIsDisableRule] = useState(true);

  // the same merge point the Review tuning section resolves through, so the row and the dialog that
  // authorizes the write cannot describe the same proposal differently
  const evidence = useMemo(() => resolveTuningEvidence(proposal), [proposal]);

  const modelChange = evidence?.change;
  const hasModelChange = modelChange != null && Object.keys(modelChange).length > 0;
  const ruleId = evidence?.ruleId;

  /**
   * What the approver is authorizing: the model's change when there is one, and
   * otherwise the enable/disable the analyst chose. Never an empty object — a patch
   * that changes nothing would be reported as an applied tuning.
   */
  const change = useMemo<PndTunableRuleChange>(
    () => (hasModelChange && modelChange != null ? modelChange : { enabled: !isDisableRule }),
    [hasModelChange, isDisableRule, modelChange]
  );

  const onToggleDisableRule = useCallback(
    (event: EuiSwitchEvent) => setIsDisableRule(event.target.checked),
    []
  );

  const onConfirmRuleId = useCallback(
    ({ rationale, ruleId: confirmedRuleId }: { rationale: string; ruleId: string }) =>
      onConfirm({ change, rationale, ruleId: confirmedRuleId }),
    [change, onConfirm]
  );

  return (
    <RuleIdConfirmDialog
      confirmLabel={i18n.TUNING_APPROVAL_CONFIRM}
      errorMessage={errorMessage}
      initialRationale={initialRationale}
      initialRuleId={ruleId}
      isLoading={isLoading}
      onCancel={onCancel}
      onConfirm={onConfirmRuleId}
      title={i18n.TUNING_APPROVAL_TITLE}
    >
      <ProposedRuleChange change={change} ruleId={ruleId} ruleName={evidence?.ruleName} />

      <EuiSpacer size="m" />

      {/* the query rewrite in full beside the query it replaces: the summary above names the field,
          but only the diff says what approving actually changes about which documents match */}
      {change.query != null ? (
        <>
          <QueryComparison currentQuery={evidence?.currentQuery} proposedQuery={change.query} />
          <EuiSpacer size="m" />
        </>
      ) : null}

      <BacktestComparison preview={evidence?.preview} />

      {evidence?.recovery === 'legacy' ? (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            announceOnMount
            color="warning"
            data-test-subj="pndTuningApprovalLegacyRecovery"
            iconType="warning"
            size="s"
            text={<p>{i18n.TUNING_LEGACY_RECOVERY_BODY}</p>}
            title={i18n.TUNING_LEGACY_RECOVERY_TITLE}
          />
        </>
      ) : null}

      {hasModelChange ? null : (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            announceOnMount
            color="warning"
            data-test-subj="pndTuningApprovalNoModelChange"
            iconType="warning"
            size="s"
            text={<p>{i18n.TUNING_NO_CHANGE_BODY}</p>}
            title={i18n.TUNING_NO_CHANGE_TITLE}
          />
          <EuiSpacer size="s" />
          <EuiSwitch
            checked={isDisableRule}
            data-test-subj="pndTuningApprovalDisableRule"
            label={i18n.TUNING_DISABLE_RULE_LABEL}
            onChange={onToggleDisableRule}
          />
        </>
      )}

      <EuiSpacer size="m" />

      <EuiText color="subdued" data-test-subj="pndTuningApprovalRuleIdNote" size="xs">
        <p>{i18n.TUNING_RULE_ID_NOTE}</p>
      </EuiText>
    </RuleIdConfirmDialog>
  );
};
