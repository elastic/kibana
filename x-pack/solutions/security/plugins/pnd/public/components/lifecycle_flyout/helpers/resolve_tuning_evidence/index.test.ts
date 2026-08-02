/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndProposalRow } from '@kbn/pnd-common';

import { resolveTuningEvidence } from '.';

const proposal = (overrides: Partial<PndProposalRow> = {}): PndProposalRow => ({
  alwaysGate: true,
  correlationId: 'ad-1',
  createdAt: '2026-08-06T00:00:00.000Z',
  gateId: 'apply_tuning',
  inputSchema: {},
  message: 'Apply a tuning to detection rule "Endpoint Security [Insights]" (61e90241)?',
  reasoning: '',
  recommendedAction: 'tune',
  reversible: false,
  sourceId: 'watch:run:step',
  stepExecutionId: 'step',
  stepId: 'await_apply_tuning',
  title: 'Apply tuning',
  workflowId: 'system-security-watch-post-incident',
  workflowRunId: 'run',
  ...overrides,
});

/** The v4 shape `reason_apply_tuning` rendered, which a row parked before v8 still carries. */
const ANCHORED_REASONING = [
  'Rule name: "Endpoint Security [Insights]".',
  'Rule id: "61e90241-0000-4000-8000-000000000000".',
  'Proposed change (enabled / investigation_fields / note only): {"enabled":false}.',
  'Backtest detail: {"notMeasured":"security.run_rule_preview is not enabled"}.',
].join(' ');

/** The v8 shape: a real query change, with the rule's own query and one count per backtest side. */
const QUERY_REASONING = [
  'Rule name: "Endpoint Security [Insights]".',
  'Rule id: "61e90241-0000-4000-8000-000000000000".',
  'Backtest alerts as-is: 95.',
  'Backtest alerts as-proposed: 3.',
  'Proposed change (enabled / investigation_fields / note / query only): {"query":"process.name : \\"powershell.exe\\" and not user.name : \\"svc-backup\\""}.',
  'Rule query as-is: "process.name : \\"powershell.exe\\"".',
].join(' ');

describe('resolveTuningEvidence', () => {
  it('has nothing to resolve without a proposal', () => {
    expect(resolveTuningEvidence(undefined)).toBeUndefined();
  });

  it('recovers the proposed change the row itself does not carry', () => {
    expect(resolveTuningEvidence(proposal({ reasoning: ANCHORED_REASONING }))?.change).toEqual({
      enabled: false,
    });
  });

  it('recovers the rule id, which the approval dialog needs', () => {
    expect(resolveTuningEvidence(proposal({ reasoning: ANCHORED_REASONING }))?.ruleId).toBe(
      '61e90241-0000-4000-8000-000000000000'
    );
  });

  it('recovers the rule name, so the approver can see what is being tuned', () => {
    expect(resolveTuningEvidence(proposal({ reasoning: ANCHORED_REASONING }))?.ruleName).toBe(
      'Endpoint Security [Insights]'
    );
  });

  it('recovers the backtest reason, so an unmeasured backtest says why', () => {
    expect(resolveTuningEvidence(proposal({ reasoning: ANCHORED_REASONING }))?.preview).toEqual({
      notMeasured: 'security.run_rule_preview is not enabled',
    });
  });

  it('renders the reasoning the row does carry', () => {
    expect(resolveTuningEvidence(proposal({ reasoning: ANCHORED_REASONING }))?.reasoning).toBe(
      ANCHORED_REASONING
    );
  });

  it('reports which carrier the fields came out of, so prose is not passed off as JSON', () => {
    expect(resolveTuningEvidence(proposal({ reasoning: ANCHORED_REASONING }))?.recovery).toBe(
      'anchored'
    );
  });

  it('prefers the row own preview over the one recovered from prose', () => {
    const preview = { after: { alertCount: 7 }, before: { alertCount: 42 } };

    expect(
      resolveTuningEvidence(proposal({ preview, reasoning: ANCHORED_REASONING }))?.preview
    ).toEqual(preview);
  });

  it('recovers the rule query as it stands, which is the only thing a rewrite can be judged against', () => {
    expect(resolveTuningEvidence(proposal({ reasoning: QUERY_REASONING }))?.currentQuery).toBe(
      'process.name : "powershell.exe"'
    );
  });

  it('recovers the proposed query rewrite', () => {
    expect(resolveTuningEvidence(proposal({ reasoning: QUERY_REASONING }))?.change).toEqual({
      query: 'process.name : "powershell.exe" and not user.name : "svc-backup"',
    });
  });

  it('recovers both backtest counts the workflow measured', () => {
    expect(resolveTuningEvidence(proposal({ reasoning: QUERY_REASONING }))?.preview).toEqual({
      after: { alertCount: 3 },
      before: { alertCount: 95 },
    });
  });

  it('reports no current query for a row parked before the watch wrote one', () => {
    expect(
      resolveTuningEvidence(proposal({ reasoning: ANCHORED_REASONING }))?.currentQuery
    ).toBeUndefined();
  });

  /**
   * A degraded card: `draft_tuning`'s `on-failure` let the run reach its gate with nothing drafted,
   * so neither the message nor the reasoning names a rule.
   */
  const degraded = proposal({
    message: 'Apply a tuning to a detection rule?',
    reasoning: 'No tuning was drafted',
  });

  it('recovers nothing from a degraded card, which has no draft to recover', () => {
    expect(resolveTuningEvidence(degraded)?.change).toBeUndefined();
  });

  it('reports no recovery for a degraded card rather than inventing a source', () => {
    expect(resolveTuningEvidence(degraded)?.recovery).toBe('none');
  });

  it('falls back to the pre-v4 prose for a row parked by an older watch', () => {
    expect(resolveTuningEvidence(proposal())?.ruleName).toBe('Endpoint Security [Insights]');
  });

  it('reports the legacy carrier for a row parked by an older watch', () => {
    expect(resolveTuningEvidence(proposal())?.recovery).toBe('legacy');
  });
});
