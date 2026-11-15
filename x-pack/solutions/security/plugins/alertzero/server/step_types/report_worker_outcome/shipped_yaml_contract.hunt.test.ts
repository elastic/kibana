/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTZERO_HUNT_PACKAGE_REPORT_WORKFLOW_ID,
  ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID } from '@kbn/alertzero-common';
import {
  ENVELOPE_FIELDS,
  describeWorkerWorkflowContracts,
  reportNamed,
  reportOnDevModeClient,
  reportStepsOf,
} from './shipped_yaml_contract.test_helpers';
import { SHIPPED_YAML_CONTRACTS } from './shipped_yaml_contract.hunt.fixture';

describe('shipped Continuous Threat Hunt Worker YAML and the reportWorkerOutcome schema', () => {
  describeWorkerWorkflowContracts(SHIPPED_YAML_CONTRACTS);

  describe('as the debug log prints them', () => {
    it('reports a Hunt report that packaging closed as benign after a Tier 2 run', () => {
      expect(
        reportOnDevModeClient(
          reportNamed(
            reportStepsOf(ALERTZERO_HUNT_PACKAGE_REPORT_WORKFLOW_ID),
            'report_report_completed'
          ),
          {
            inputs: {
              hasConfirmedHit: false,
              huntStatus: 'success',
              investigationConversationId: '3f1c2b4a-5d6e-5f70-8a9b-0c1d2e3f4a5b',
              tier2_invoked: true,
            },
            steps: {
              decide_and_package: {
                output: {
                  coverage: { skipped: [], written: [{ kiId: 'ki-1' }, { kiId: 'ki-2' }] },
                  dismiss: true,
                  mintSuppression: 'none',
                  proposals: [],
                  status: 'packaged',
                },
              },
            },
            variables: {
              dismiss_close_failed: false,
              dispatch_failed_count: 0,
              package_status: 'success',
            },
          },
          SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID
        )
      ).toEqual({
        eventType: 'alertzero_hunt_report_completed',
        payload: {
          ...ENVELOPE_FIELDS,
          watch_tag: 'watch-hunt',
          worker_id: 'system-security-hunt-continuous-threat-hunt',
          closed_clean: true,
          coverage_kis_skipped: 0,
          coverage_kis_written: 2,
          has_confirmed_hit: false,
          hunt_status: 'success',
          investigation_id: '3f1c2b4a-5d6e-5f70-8a9b-0c1d2e3f4a5b',
          mint_suppression: 'none',
          package_status: 'success',
          proposals_dispatch_failed: 0,
          proposals_prepared: 0,
          tier2_invoked: true,
        },
      });
    });

    it('reports a Hunt sweep with one partial and one failed report', () => {
      expect(
        reportOnDevModeClient(
          reportNamed(
            reportStepsOf(ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID),
            'report_worker_run_completed'
          ),
          {
            steps: {
              check_index_scope: { output: { status: 'ok' } },
              report_fan_out: {
                output: {
                  failed: 0,
                  results: [
                    { output: { outcome: 'completed' }, status: 'completed' },
                    { output: { outcome: 'partial' }, status: 'completed' },
                    { output: { outcome: 'failed' }, status: 'completed' },
                  ],
                },
              },
              resolve_index_scope_gate: { output: { index_scope_blocked: false } },
              select_candidate_reports: { output: { ids: ['r-1', 'r-2', 'r-3'] } },
            },
          },
          SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID
        )
      ).toEqual({
        eventType: 'alertzero_worker_run_completed',
        payload: {
          ...ENVELOPE_FIELDS,
          watch_tag: 'watch-hunt',
          worker_id: 'system-security-hunt-continuous-threat-hunt',
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
  });
});
