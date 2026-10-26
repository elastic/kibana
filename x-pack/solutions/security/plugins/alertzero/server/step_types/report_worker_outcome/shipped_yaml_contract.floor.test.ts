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
          verdicts_false_positive: 23,
          verdicts_inconclusive: 5,
          verdicts_true_positive: 10,
        },
      });
    });

    it('reports the pattern key statistics of an Alert Triage batch', () => {
      expect(
        reportOnDevModeClient(
          reportNamed(
            reportStepsOf(ALERTZERO_FLOOR_ALERT_TRIAGE_BATCH_WORKFLOW_ID),
            'report_batch_grouped'
          ),
          {
            steps: {
              tag_pattern_keys: {
                output: {
                  alerts_with_strict_key: 36,
                  fp_candidates_on_fallback: 4,
                  strict_keys: 12,
                  strict_keys_single_alert: 5,
                  wide_keys: 8,
                  wide_keys_single_alert: 3,
                },
              },
              group_fp_candidates_call: {
                output: { alerts_joined: 7, alerts_pooled: 2, proposals_created: 3 },
              },
            },
            variables: { failure_conversation_count: 0, mint_count: 3, verdict_count: 40 },
          },
          SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID
        )
      ).toEqual({
        eventType: 'alertzero_alert_triage_batch_grouped',
        payload: {
          ...ENVELOPE_FIELDS,
          watch_tag: 'watch-floor',
          worker_id: 'system-security-floor-alert-triage',
          alerts_joined: 7,
          alerts_pooled: 2,
          alerts_with_strict_key: 36,
          conversation_created: true,
          fp_candidates_on_fallback: 4,
          proposals_created: 3,
          strict_keys: 12,
          strict_keys_single_alert: 5,
          wide_keys: 8,
          wide_keys_single_alert: 3,
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
              started_alert_count: 20,
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
