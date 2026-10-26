/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReportWorkerOutcomeStepInput } from '../../../common/step_types';
import type { AlertZeroEnvelope } from '../../telemetry';
import { ALERTZERO_TELEMETRY_EVENTS } from '../../telemetry';
import { reportOutcome } from './report_outcome';

const envelope: AlertZeroEnvelope = {
  execution_id: 'exec-review',
  is_default_space: true,
  run_id: 'exec-root',
  trigger_type: 'scheduled',
  watch_tag: 'watch-floor',
  worker_id: 'system-security-floor-attack-discovery',
};

describe('reportOutcome', () => {
  it.each([
    [
      ALERTZERO_TELEMETRY_EVENTS.AdWorkerRunCompleted,
      {
        alerts_analyzed: 1,
        attacks_generated: 1,
        attacks_persisted: 1,
        batches_failed: 0,
        batches_total: 1,
        event: 'ad_worker_run_completed' as const,
        run_outcome: 'produced' as const,
      },
    ],
    [
      ALERTZERO_TELEMETRY_EVENTS.AdWorkerReviewStarted,
      {
        event: 'ad_worker_review_started' as const,
        investigation_id: '0b9f4a3e-1c2d-8e3f-8a4b-5c6d7e8f9a0b',
        is_rereview: false,
      },
    ],
    [
      ALERTZERO_TELEMETRY_EVENTS.AdWorkerAnalysisCompleted,
      {
        analysis_error: false,
        event: 'ad_worker_analysis_completed' as const,
        verdict: 'failed' as const,
      },
    ],
    [
      ALERTZERO_TELEMETRY_EVENTS.AdWorkerHandoffResolved,
      {
        auto_approve_requested: false,
        event: 'ad_worker_handoff_resolved' as const,
        outcome: 'expired' as const,
        verdict: 'inconclusive' as const,
      },
    ],
    [
      ALERTZERO_TELEMETRY_EVENTS.WorkerInvestigationClosed,
      {
        close_reason: 'other' as const,
        event: 'worker_investigation_closed' as const,
        investigation_id: '0b9f4a3e-1c2d-8e3f-8a4b-5c6d7e8f9a0b',
      },
    ],
    [
      ALERTZERO_TELEMETRY_EVENTS.WorkerRunCompleted,
      {
        candidates_found: 0,
        degraded_reason: 'none' as const,
        event: 'worker_run_completed' as const,
        items_dispatched: 0,
        items_failed: 0,
        items_in_flight: 0,
        lookup_failed: false,
        run_outcome: 'empty_nothing_pending' as const,
        source_read_failed: false,
      },
    ],
    [
      ALERTZERO_TELEMETRY_EVENTS.AlertTriageBatchClassified,
      {
        alerts_total: 1,
        alerts_without_verdict: 0,
        event: 'alert_triage_batch_classified' as const,
        fp_below_floor: 0,
        fp_candidates: 0,
        investigation_id: '0b9f4a3e-1c2d-8e3f-8a4b-5c6d7e8f9a0b',
        verdicts_false_positive: 0,
        verdicts_inconclusive: 0,
        verdicts_true_positive: 1,
      },
    ],
    [
      ALERTZERO_TELEMETRY_EVENTS.AlertTriageBatchGrouped,
      {
        alerts_joined: 0,
        alerts_pooled: 0,
        alerts_with_strict_key: 1,
        conversation_created: false,
        event: 'alert_triage_batch_grouped' as const,
        fp_candidates_on_fallback: 0,
        proposals_created: 0,
        strict_keys: 1,
        strict_keys_single_alert: 1,
        wide_keys: 1,
        wide_keys_single_alert: 1,
      },
    ],
    [
      ALERTZERO_TELEMETRY_EVENTS.AlertTriageClosureResolved,
      {
        alerts_proposed: 1,
        alerts_retag_failed: 0,
        revisions: 1,
        auto_approve_requested: false,
        event: 'alert_triage_closure_resolved' as const,
        investigation_id: '0b9f4a3e-1c2d-8e3f-8a4b-5c6d7e8f9a0b',
        outcome: 'expired' as const,
        proposal_read_failed: false,
      },
    ],
    [
      ALERTZERO_TELEMETRY_EVENTS.RuleTuningReviewCompleted,
      {
        applied: false,
        approved_not_applied: false,
        backtest_ran: false,
        backtest_reduced_alerts: false,
        change_type: 'none' as const,
        confidence: 'none' as const,
        decision: 'none' as const,
        entry_gate: 'declined' as const,
        event: 'rule_tuning_review_completed' as const,
        rule_unavailable: false,
      },
    ],
    [
      ALERTZERO_TELEMETRY_EVENTS.RuleCoverageReviewCompleted,
      {
        applied: false,
        approved_not_applied: false,
        check_failed: true,
        creation_failed: false,
        creation_skipped: false,
        decision: 'none' as const,
        entry_gate: 'skipped' as const,
        event: 'rule_coverage_review_completed' as const,
        ki_processed: false,
        proposal_kind: 'none' as const,
        rule_created: false,
        verdict: 'none' as const,
      },
    ],
    [
      ALERTZERO_TELEMETRY_EVENTS.HuntReportCompleted,
      {
        closed_clean: false,
        coverage_kis_skipped: 0,
        coverage_kis_written: 0,
        event: 'hunt_report_completed' as const,
        has_confirmed_hit: false,
        hunt_status: 'failed' as const,
        mint_suppression: 'none' as const,
        package_status: 'run_incomplete' as const,
        proposals_dispatch_failed: 0,
        proposals_prepared: 0,
      },
    ],
    [
      ALERTZERO_TELEMETRY_EVENTS.EndpointAnalysisCompleted,
      {
        actions_recommended: 0,
        agent_failed: false,
        analysis_outcome: 'no_host' as const,
        auto_approve_requested: false,
        event: 'endpoint_analysis_completed' as const,
        findings_attached: false,
        host_resolved: false,
        iocs_found: false,
        proposals_dispatch_failed: 0,
        proposals_dispatched: 0,
        reused_prior_assessment: false,
        timeline_found: false,
      },
    ],
  ])('reports %s for its input event', (eventType, input) => {
    const report = jest.fn().mockReturnValue(true);

    reportOutcome({ envelope, input, report });

    expect(report.mock.calls[0][0]).toBe(eventType);
  });

  it.each([
    ['none', false],
    ['dependency_unavailable', true],
  ] as const)(
    'reports a run whose degraded reason is %s as degraded: %s',
    (degradedReason, degraded) => {
      const report = jest.fn().mockReturnValue(true);

      reportOutcome({
        envelope,
        input: {
          candidates_found: 1,
          degraded_reason: degradedReason,
          event: 'worker_run_completed',
          items_dispatched: 1,
          items_failed: 0,
          items_in_flight: 0,
          lookup_failed: false,
          run_outcome: 'produced',
          source_read_failed: false,
        },
        report,
      });

      expect(report.mock.calls[0][1]).toEqual(
        expect.objectContaining({ degraded, degraded_reason: degradedReason })
      );
    }
  );

  // A YAML author who sets a flag but forgets the reason must not ship a run as healthy.
  it.each([
    ['a failed lookup', { lookup_failed: true }],
    ['a failed source read', { source_read_failed: true }],
    ['a failed item', { items_failed: 1 }],
  ] as const)('reports a run with %s as degraded even when it names no reason', (_case, flags) => {
    const report = jest.fn().mockReturnValue(true);

    reportOutcome({
      envelope,
      input: {
        candidates_found: 1,
        degraded_reason: 'none',
        event: 'worker_run_completed',
        items_dispatched: 1,
        items_failed: 0,
        items_in_flight: 0,
        lookup_failed: false,
        run_outcome: 'produced',
        source_read_failed: false,
        ...flags,
      },
      report,
    });

    expect(report.mock.calls[0][1]).toEqual(expect.objectContaining({ degraded: true }));
  });

  it('merges the envelope and drops the discriminator', () => {
    const report = jest.fn().mockReturnValue(true);

    reportOutcome({
      envelope,
      input: { analysis_error: true, event: 'ad_worker_analysis_completed', verdict: 'failed' },
      report,
    });

    expect(report.mock.calls[0][1]).toEqual({
      ...envelope,
      analysis_error: true,
      verdict: 'failed',
    });
  });

  it('keeps every envelope field when an input field has the same name', () => {
    const report = jest.fn().mockReturnValue(true);
    const input = {
      analysis_error: true,
      event: 'ad_worker_analysis_completed',
      run_id: 'exec-forged',
      trigger_type: 'manual',
      verdict: 'failed',
      worker_id: 'system-security-hunt-continuous-threat-hunt',
    } as ReportWorkerOutcomeStepInput;

    reportOutcome({ envelope, input, report });

    expect(report.mock.calls[0][1]).toEqual(expect.objectContaining(envelope));
  });

  it.each<{
    closeReason: 'benign' | 'false_positive';
    investigationEnvelope: AlertZeroEnvelope;
    investigationId: string;
    title: string;
  }>([
    {
      closeReason: 'false_positive',
      investigationEnvelope: envelope,
      investigationId: '0b9f4a3e-1c2d-8e3f-8a4b-5c6d7e8f9a0b',
      title: 'reports an Investigation close with its id and reason on top of the envelope',
    },
    {
      closeReason: 'benign',
      investigationEnvelope: {
        ...envelope,
        watch_tag: 'watch-hunt',
        worker_id: 'system-security-hunt-continuous-threat-hunt',
      },
      investigationId: '3f1c2b4a-5d6e-5f70-8a9b-0c1d2e3f4a5b',
      title: 'reports another Worker Investigation close under that Worker envelope',
    },
  ])('$title', ({ closeReason, investigationEnvelope, investigationId }) => {
    const report = jest.fn().mockReturnValue(true);

    reportOutcome({
      envelope: investigationEnvelope,
      input: {
        close_reason: closeReason,
        event: 'worker_investigation_closed',
        investigation_id: investigationId,
      },
      report,
    });

    expect(report.mock.calls).toEqual([
      [
        ALERTZERO_TELEMETRY_EVENTS.WorkerInvestigationClosed,
        {
          ...investigationEnvelope,
          close_reason: closeReason,
          investigation_id: investigationId,
        },
      ],
    ]);
  });

  it('omits optional fields the input left undefined', () => {
    const report = jest.fn().mockReturnValue(true);

    reportOutcome({
      envelope,
      input: {
        closed_clean: false,
        coverage_kis_skipped: 0,
        coverage_kis_written: 0,
        event: 'hunt_report_completed',
        has_confirmed_hit: false,
        hunt_status: 'failed',
        investigation_id: undefined,
        mint_suppression: 'none',
        package_status: 'run_incomplete',
        proposals_dispatch_failed: 0,
        proposals_prepared: 0,
        tier2_invoked: undefined,
      },
      report,
    });

    expect(
      ['investigation_id', 'tier2_invoked'].filter((key) => key in report.mock.calls[0][1])
    ).toEqual([]);
  });

  it('returns whether the reporter reported', () => {
    const report = jest.fn().mockReturnValue(false);

    expect(
      reportOutcome({
        envelope,
        input: {
          event: 'ad_worker_review_started',
          investigation_id: '0b9f4a3e-1c2d-8e3f-8a4b-5c6d7e8f9a0b',
          is_rereview: false,
        },
        report,
      })
    ).toBe(false);
  });
});
