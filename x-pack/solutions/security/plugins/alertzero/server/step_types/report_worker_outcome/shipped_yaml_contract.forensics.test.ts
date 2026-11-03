/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW_ID,
  ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID } from '@kbn/alertzero-common';
import {
  ENVELOPE_FIELDS,
  describeWorkerWorkflowContracts,
  reportNamed,
  reportOnDevModeClient,
  reportStepsOf,
} from './shipped_yaml_contract.test_helpers';
import { SHIPPED_YAML_CONTRACTS } from './shipped_yaml_contract.forensics.fixture';

describe('shipped Endpoint Analysis Worker YAML and the reportWorkerOutcome schema', () => {
  describeWorkerWorkflowContracts(SHIPPED_YAML_CONTRACTS);

  describe('as the debug log prints them', () => {
    it('reports an Endpoint Analysis run that attached findings and proposed containment', () => {
      expect(
        reportOnDevModeClient(
          reportNamed(
            reportStepsOf(ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW_ID),
            'report_analysis_completed'
          ),
          {
            steps: {
              forensic_analysis: {
                output: { structured_output: { propose: true, recommendedActions: [{}, {}] } },
              },
              propose_actions: { output: { failed: 0, succeeded: 2 } },
              read_ki: { output: { hits: { hits: [{ _id: 'ki-1' }] } } },
              resolve_autonomy: { output: { level: 'manual' } },
              resolve_finding_presence: { output: { iocs: true, timeline: true } },
              resolve_host: { output: { host_name: 'host-1' } },
              resolve_prior_assessment: { output: { count: 0 } },
              resolve_proposal_dispatch: { output: { failed: 0 } },
              resolve_proposals: { output: { proposals_lost: false } },
              resolve_request: { output: { has_request: true } },
              resolve_run_outcome: { output: { attached: true, settled: true } },
              verify_investigation: { output: { metadata: {} } },
            },
          },
          SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID
        )
      ).toEqual({
        eventType: 'alertzero_endpoint_analysis_completed',
        payload: {
          ...ENVELOPE_FIELDS,
          watch_tag: 'watch-forensics',
          worker_id: 'system-security-forensics-endpoint-analysis',
          actions_recommended: 2,
          agent_failed: false,
          analysis_outcome: 'processed',
          auto_approve_requested: false,
          findings_attached: true,
          host_resolved: true,
          iocs_found: true,
          proposals_dispatch_failed: 0,
          proposals_dispatched: 2,
          reused_prior_assessment: false,
          timeline_found: true,
        },
      });
    });

    it('reports an Endpoint Analysis poll that started an analysis', () => {
      expect(
        reportOnDevModeClient(
          reportNamed(
            reportStepsOf(ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW_ID),
            'report_worker_run_completed'
          ),
          {
            steps: {
              search_pending_indicators: { output: { hits: { total: { value: 3 } } } },
              start_runs: { output: { failed: 0, succeeded: 3 } },
              // One of the three dispatches was an indicator whose analysis is still running.
              resolve_reported_starts: { output: { started: 2 } },
            },
          },
          SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID
        )
      ).toEqual({
        eventType: 'alertzero_worker_run_completed',
        payload: {
          ...ENVELOPE_FIELDS,
          watch_tag: 'watch-forensics',
          worker_id: 'system-security-forensics-endpoint-analysis',
          candidates_found: 3,
          degraded: false,
          degraded_reason: 'none',
          items_dispatched: 2,
          items_failed: 0,
          items_in_flight: 2,
          lookup_failed: false,
          run_outcome: 'produced',
          source_read_failed: false,
        },
      });
    });
  });
});
