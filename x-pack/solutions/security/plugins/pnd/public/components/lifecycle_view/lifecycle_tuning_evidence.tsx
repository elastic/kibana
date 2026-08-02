/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';

import { BacktestComparison } from '../backtest_comparison';
import { ProposedRuleChange } from '../proposed_rule_change';
import type { PndTuningEvidence } from './helpers/read_tuning_evidence';
import * as i18n from './translations';

export interface LifecycleTuningEvidenceProps {
  evidence: PndTuningEvidence;
}

/**
 * What the tuning gate is actually asking the analyst to approve: the change, why the model proposed
 * it, and what the backtest measured.
 *
 * The backtest is rendered unconditionally, because `BacktestComparison` turns a missing preview into
 * an explicit "no backtest available" — a blank there would read as "no change expected", which is
 * the opposite of the truth. The proposed change is rendered the same way: a proposal that carries no
 * structured rule patch says so, rather than looking like an approved-and-empty change.
 */
export const LifecycleTuningEvidence: React.FC<LifecycleTuningEvidenceProps> = ({
  evidence: { change, preview, reasoning, ruleId },
}) => (
  <EuiPanel
    color="subdued"
    data-test-subj="pndLifecycleTuningEvidence"
    hasShadow={false}
    paddingSize="s"
  >
    <EuiTitle size="xxs">
      <h4>{i18n.TUNING_EVIDENCE_TITLE}</h4>
    </EuiTitle>
    <EuiSpacer size="xs" />
    <ProposedRuleChange change={change} ruleId={ruleId} />
    {reasoning != null ? (
      <>
        <EuiSpacer size="s" />
        <EuiTitle size="xxs">
          <h4>{i18n.TUNING_REASONING_TITLE}</h4>
        </EuiTitle>
        <EuiText color="subdued" data-test-subj="pndLifecycleTuningReasoning" size="xs">
          {reasoning}
        </EuiText>
      </>
    ) : null}
    <EuiSpacer size="s" />
    <BacktestComparison preview={preview} />
  </EuiPanel>
);
