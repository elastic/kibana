/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTZERO_FLOOR_ALERT_TRIAGE_BATCH_WORKFLOW_ID } from '@kbn/workflows/managed';
import { SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID } from '@kbn/alertzero-common';
import {
  ENVELOPE_FIELDS,
  INVESTIGATION_ID,
  describeWorkerWorkflowContracts,
  reportNamed,
  reportOnDevModeClient,
  reportStepsOf,
} from './shipped_yaml_contract.test_helpers';
import { SHIPPED_YAML_CONTRACTS } from './shipped_yaml_contract.floor.fixture';

describe('shipped Alert Triage Worker YAML and the reportWorkerOutcome schema', () => {
  describeWorkerWorkflowContracts(SHIPPED_YAML_CONTRACTS);

  describe('as the debug log prints them', () => {
    it('reports an Alert Triage batch with false-positive candidates', () => {
      expect(
        reportOnDevModeClient(
          reportNamed(
            reportStepsOf(ALERTZERO_FLOOR_ALERT_TRIAGE_BATCH_WORKFLOW_ID),
            'report_batch_classified'
          ),
          {
            steps: {
              classify_alerts: {
                output: {
                  false_positive_count: 23,
                  inconclusive_count: 5,
                  true_positive_count: 10,
                },
              },
              create_investigation: { output: { conversation_id: INVESTIGATION_ID } },
            },
            variables: { alert_count: 40, fp_candidate_count: 20, verdict_count: 38 },
          },
          SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID
        )
      ).toEqual({
        eventType: 'alertzero_alert_triage_batch_classified',
        payload: {
          ...ENVELOPE_FIELDS,
          watch_tag: 'watch-floor',
          worker_id: 'system-security-floor-alert-triage',
          alerts_total: 40,
          alerts_without_verdict: 2,
          fp_below_floor: 3,
          fp_candidates: 20,
          investigation_id: INVESTIGATION_ID,
          verdicts_false_positive: 23,
          verdicts_inconclusive: 5,
          verdicts_true_positive: 10,
        },
      });
    });

    it('reports an Alert Triage run that handed its candidates to the closure review', () => {
      expect(
        reportOnDevModeClient(
          reportNamed(
            reportStepsOf(ALERTZERO_FLOOR_ALERT_TRIAGE_BATCH_WORKFLOW_ID),
            'report_worker_run_completed'
          ),
          {
            variables: {
              alert_count: 40,
              fp_candidate_count: 20,
              review_dispatch: 'started',
              verdict_count: 38,
            },
          },
          SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID
        )
      ).toEqual({
        eventType: 'alertzero_worker_run_completed',
        payload: {
          ...ENVELOPE_FIELDS,
          watch_tag: 'watch-floor',
          worker_id: 'system-security-floor-alert-triage',
          candidates_found: 40,
          degraded: true,
          degraded_reason: 'missing_data',
          items_dispatched: 38,
          items_failed: 2,
          items_in_flight: 20,
          lookup_failed: false,
          run_outcome: 'degraded_partial',
          source_read_failed: false,
        },
      });
    });
  });
});
