/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTZERO_FORENSICS_PROPOSAL_GATE_WORKFLOW_ID,
  ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW_ID,
  ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID } from '@kbn/alertzero-common';
import type { WorkerWorkflowContract } from './shipped_yaml_contract.test_helpers';
import { INVESTIGATION_ID } from './shipped_yaml_contract.test_helpers';

/**
 * The Endpoint Analysis Worker's workflows with report steps, and runs where every report step's
 * guard passes, the way the engine would have them.
 */
export const SHIPPED_YAML_CONTRACTS: WorkerWorkflowContract[] = [
  {
    contexts: [
      {
        steps: {
          search_pending_indicators: { output: { hits: { total: { value: 2 } } } },
          start_runs: { output: { failed: 1, succeeded: 1 } },
        },
      },
      { steps: { search_pending_indicators: { error: { message: 'search failed' } } } },
    ],
    workerId: SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
    workflowId: ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW_ID,
  },
  {
    contexts: [
      {
        steps: {
          forensic_analysis: {
            output: { structured_output: { propose: true, recommendedActions: [{}, {}] } },
          },
          propose_actions: { output: { failed: 0, succeeded: 2 } },
          read_ki: { output: { hits: { hits: [{ _id: 'ki-1' }] } } },
          resolve_autonomy: { output: { level: 'supervised' } },
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
      { steps: { read_ki: { output: { hits: { hits: [] } } } } },
    ],
    workerId: SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
    workflowId: ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW_ID,
  },
  {
    contexts: [
      {
        inputs: { investigationConversationId: INVESTIGATION_ID },
        steps: {
          close_if_settled: { output: { conversation_id: INVESTIGATION_ID, status: 'closed' } },
          read_status_before_close: { output: { metadata: { status: 'open' } } },
        },
      },
    ],
    workerId: SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
    workflowId: ALERTZERO_FORENSICS_PROPOSAL_GATE_WORKFLOW_ID,
  },
];
