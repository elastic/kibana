/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID } from '@kbn/alertzero-common';
import { REPORT_WORKER_OUTCOME_EVENTS } from '../../../common/step_types';
import { EVENT_WORKER_IDS, isEventFromItsWorker } from './event_worker_ids';
import {
  ENVELOPE_FIELDS,
  INVESTIGATION_ID,
  describeWorkerWorkflowContracts,
  parseRendered,
  reportNamed,
  reportOnDevModeClient,
  reportStepsOf,
} from './shipped_yaml_contract.test_helpers';
import {
  SHIPPED_YAML_CONTRACTS,
  reviewContext,
  runnerContext,
} from './shipped_yaml_contract.attack_discovery.fixture';

const runnerReports = reportStepsOf(ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID);
const reviewReports = reportStepsOf(ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID);

describe('shipped Attack Discovery Worker YAML and the reportWorkerOutcome schema', () => {
  describeWorkerWorkflowContracts(SHIPPED_YAML_CONTRACTS);

  // A set, because both review close sites report `worker_investigation_closed`.
  it('reports every Attack Discovery event and the two events any Worker shares', () => {
    expect(
      [...new Set([...runnerReports, ...reviewReports].map((step) => step.with?.event))].sort()
    ).toEqual(
      REPORT_WORKER_OUTCOME_EVENTS.filter(
        (event) =>
          EVENT_WORKER_IDS[event] === SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID ||
          event === 'worker_run_completed' ||
          event === 'worker_investigation_closed'
      ).sort()
    );
  });

  it('reports only events the step accepts from the Attack Discovery Worker', () => {
    expect(
      [...runnerReports, ...reviewReports]
        .map((step) => String(step.with?.event))
        .filter(
          (event) =>
            !(REPORT_WORKER_OUTCOME_EVENTS as readonly string[]).includes(event) ||
            !isEventFromItsWorker(
              event as (typeof REPORT_WORKER_OUTCOME_EVENTS)[number],
              SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID
            )
        )
    ).toEqual([]);
  });

  describe('the runner', () => {
    const report = reportNamed(runnerReports, 'report_run_completed');

    it.each([
      ['produced', { batchesFailed: 0, batchesTotal: 3, generated: 5, persisted: 4 }],
      ['empty_no_alerts', { batchesFailed: 0, batchesTotal: 0, generated: 0, persisted: 0 }],
      ['empty_no_attacks', { batchesFailed: 0, batchesTotal: 2, generated: 0, persisted: 0 }],
      ['empty_all_duplicates', { batchesFailed: 0, batchesTotal: 2, generated: 3, persisted: 0 }],
      ['degraded_partial', { batchesFailed: 1, batchesTotal: 3, generated: 2, persisted: 2 }],
      ['failed_all_batches', { batchesFailed: 3, batchesTotal: 3, generated: 0, persisted: 0 }],
    ] as const)('sends a valid %s run_completed', (runOutcome, scenario) => {
      expect(parseRendered(report, runnerContext(scenario))).toEqual({
        data: {
          alerts_analyzed: scenario.batchesTotal * 100,
          attacks_generated: scenario.generated,
          attacks_persisted: scenario.persisted,
          batches_failed: scenario.batchesFailed,
          batches_total: scenario.batchesTotal,
          event: 'ad_worker_run_completed',
          run_outcome: runOutcome,
        },
        success: true,
      });
    });

    it.each([
      ['produced', { batchesFailed: 0, batchesTotal: 3, generated: 5, persisted: 4 }],
      ['empty_nothing_pending', { batchesFailed: 0, batchesTotal: 0, generated: 0, persisted: 0 }],
      ['empty_nothing_found', { batchesFailed: 0, batchesTotal: 2, generated: 3, persisted: 0 }],
      ['degraded_partial', { batchesFailed: 1, batchesTotal: 3, generated: 2, persisted: 2 }],
      ['failed_all_items', { batchesFailed: 3, batchesTotal: 3, generated: 0, persisted: 0 }],
    ] as const)('sends a valid %s worker_run_completed', (runOutcome, scenario) => {
      const degraded = scenario.batchesFailed > 0;

      expect(
        parseRendered(
          reportNamed(runnerReports, 'report_worker_run_completed'),
          runnerContext(scenario)
        )
      ).toEqual({
        data: {
          candidates_found: scenario.batchesTotal,
          degraded_reason: degraded ? 'dependency_unavailable' : 'none',
          event: 'worker_run_completed',
          items_dispatched: scenario.batchesTotal,
          items_failed: scenario.batchesFailed,
          items_in_flight: 0,
          lookup_failed: false,
          run_outcome: runOutcome,
          source_read_failed: false,
        },
        success: true,
      });
    });

    it('reports a worker_run_completed payload the registered schema accepts', () => {
      expect(
        reportOnDevModeClient(
          reportNamed(runnerReports, 'report_worker_run_completed'),
          runnerContext({ batchesFailed: 1, batchesTotal: 3, generated: 2, persisted: 2 }),
          SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID
        )
      ).toEqual({
        eventType: 'alertzero_worker_run_completed',
        payload: {
          ...ENVELOPE_FIELDS,
          watch_tag: 'watch-floor',
          worker_id: 'system-security-floor-attack-discovery',
          candidates_found: 3,
          degraded: true,
          degraded_reason: 'dependency_unavailable',
          items_dispatched: 3,
          items_failed: 1,
          items_in_flight: 0,
          lookup_failed: false,
          run_outcome: 'degraded_partial',
          source_read_failed: false,
        },
      });
    });

    it('sends a valid worker_run_completed when the generation output is empty', () => {
      expect(
        parseRendered(reportNamed(runnerReports, 'report_worker_run_completed'), {
          steps: { resolve_fanout: { output: {} }, run_generation: { output: {} } },
        }).success
      ).toBe(true);
    });

    it('sends a valid run_completed when the generation output is empty', () => {
      expect(
        parseRendered(report, {
          steps: { resolve_fanout: { output: {} }, run_generation: { output: {} } },
        }).success
      ).toBe(true);
    });
  });

  describe('the review', () => {
    it.each([
      ['a first review', false, false],
      ['a re-review', true, true],
    ])('sends a valid review_started for %s', (_scenario, rereview, expected) => {
      expect(
        parseRendered(
          reportNamed(reviewReports, 'report_review_started'),
          reviewContext({ rereview })
        )
      ).toEqual({
        data: {
          event: 'ad_worker_review_started',
          investigation_id: INVESTIGATION_ID,
          is_rereview: expected,
        },
        success: true,
      });
    });

    it.each([
      ['a completed analysis', false, 'true_positive'],
      ['a failed analysis', true, 'failed'],
    ])('sends a valid analysis_completed for %s', (_scenario, analysisFailed, verdict) => {
      expect(
        parseRendered(
          reportNamed(reviewReports, 'report_analysis_completed'),
          reviewContext({ analysisFailed })
        )
      ).toEqual({
        data: { analysis_error: analysisFailed, event: 'ad_worker_analysis_completed', verdict },
        success: true,
      });
    });

    it.each([
      ['report_investigation_closed_false_positive', 'false_positive'],
      ['report_investigation_closed_declined', 'other'],
    ])('sends a valid investigation_closed from %s', (name, closeReason) => {
      expect(parseRendered(reportNamed(reviewReports, name), reviewContext())).toEqual({
        data: {
          close_reason: closeReason,
          event: 'worker_investigation_closed',
          investigation_id: INVESTIGATION_ID,
        },
        success: true,
      });
    });

    it('sends a valid handoff_resolved', () => {
      expect(
        parseRendered(reportNamed(reviewReports, 'report_handoff_resolved'), reviewContext())
      ).toEqual({
        data: {
          auto_approve_requested: false,
          event: 'ad_worker_handoff_resolved',
          outcome: 'approved',
          verdict: 'true_positive',
        },
        success: true,
      });
    });
  });
});
