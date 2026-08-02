/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';

import { useProposals } from '../../../../hooks/use_proposals_api';
import { PndQueryState } from '../../../../states';
import { BacktestComparison } from '../../../backtest_comparison';
import { selectTuningProposal } from '../../../lifecycle_view';
import { ProposedRuleChange } from '../../../proposed_rule_change';
import { QueryComparison } from '../../../query_comparison';
import { resolveTuningEvidence } from '../../helpers/resolve_tuning_evidence';
import * as i18n from '../../translations';

export interface LifecycleTuningSectionProps {
  correlationId: string;
}

/**
 * Review tuning: what the `await_apply_tuning` gate is asking an analyst to authorize.
 *
 * A **place to read** rather than a second button on the proposal card. A tuning is a write to a
 * production detection rule, so the evidence behind it is somewhere the analyst goes, not an extra
 * affordance competing with Approve and Dismiss on a row that is already dense.
 *
 * Since decision 1 of the 2026-08-17 sync that place is a **section inside Overview** rather than a
 * tab of its own. Register #49 records the edge that creates and why it is accepted: this is an
 * **authorization** surface — where an analyst reads what a `tune` approval writes to a production
 * detection rule — so it keeps its own heading and its own `pndLifecycleSection-tuning` block rather
 * than being blended into the fields table above it.
 *
 * Reads the queue through `useProposals`, the single producer for `queryKeys.proposals.list()`
 * (D15). Registering a second `queryFn` under that key would silently empty either this section or
 * the queue at `/`, depending only on which mounted first.
 *
 * Only *pending* gates are listed, so this section has something to show exactly while the loop is
 * parked at 4.3 — which is when someone is deciding. Once the tuning is applied or dismissed the
 * gate resolves and the section goes back to its empty state; that is the answer, not a loss.
 *
 * The backtest is rendered unconditionally, because `BacktestComparison` turns a missing preview
 * into an explicit "no backtest available": a blank reads as "no change expected", which is the
 * opposite of the truth. The proposed change is rendered the same way.
 *
 * The query diff is the one thing rendered *conditionally*, because a tuning that rewrites no query
 * has no diff: showing the rule's current query on its own would read as though a query change were
 * being proposed. It resolves through the same {@link resolveTuningEvidence} the approval dialog
 * uses, so the section an analyst reads and the dialog that writes the rule show one story.
 */
export const LifecycleTuningSection: React.FC<LifecycleTuningSectionProps> = ({
  correlationId,
}) => {
  const { data, error, isLoading, refetch } = useProposals({
    enabled: correlationId !== '',
  });

  const evidence = useMemo(
    () =>
      resolveTuningEvidence(
        selectTuningProposal({
          correlationId,
          groups: data?.proposals.groups ?? [],
        })
      ),
    [correlationId, data]
  );

  const onRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <div data-test-subj="pndLifecycleSection-tuning">
      <EuiTitle size="xs">
        <h3>{i18n.SECTION_TUNING}</h3>
      </EuiTitle>

      <EuiSpacer size="s" />

      <PndQueryState
        emptyBody={i18n.TUNING_EMPTY_BODY}
        emptyTitle={i18n.TUNING_EMPTY_TITLE}
        error={error}
        isAttackDiscoveryWorkflowsEnabled={data?.isAttackDiscoveryWorkflowsEnabled}
        isEmpty={evidence == null}
        isLoading={isLoading}
        loadingLabel={i18n.TUNING_LOADING}
        onRetry={onRetry}
      >
        {evidence != null ? (
          <div data-recovery={evidence.recovery} data-test-subj="pndLifecycleTuningReview">
            <ProposedRuleChange
              change={evidence.change}
              ruleId={evidence.ruleId}
              ruleName={evidence.ruleName}
            />

            {evidence.reasoning != null ? (
              <>
                <EuiSpacer size="s" />
                <EuiTitle size="xxs">
                  <h4>{i18n.TUNING_REASONING_TITLE}</h4>
                </EuiTitle>
                <EuiText color="subdued" data-test-subj="pndLifecycleTuningReasoning" size="xs">
                  {evidence.reasoning}
                </EuiText>
              </>
            ) : null}

            {evidence.change?.query != null ? (
              <>
                <EuiSpacer size="s" />
                <QueryComparison
                  currentQuery={evidence.currentQuery}
                  proposedQuery={evidence.change.query}
                />
              </>
            ) : null}

            <EuiSpacer size="s" />

            <BacktestComparison preview={evidence.preview} />
          </div>
        ) : null}
      </PndQueryState>
    </div>
  );
};
