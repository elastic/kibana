/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTZERO_HUNT_PACKAGE_REPORT_WORKFLOW_ID,
  ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW_ID,
  ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID } from '@kbn/alertzero-common';
import type { WorkerWorkflowContract } from './shipped_yaml_contract.test_helpers';
import { CHANGED_STATUS, INVESTIGATION_ID } from './shipped_yaml_contract.test_helpers';

/**
 * The Continuous Threat Hunt Worker's workflows with report steps, and runs where every report
 * step's guard passes, the way the engine would have them.
 */
export const SHIPPED_YAML_CONTRACTS: WorkerWorkflowContract[] = [
  {
    contexts: [
      {
        steps: {
          check_index_scope: { output: { status: 'ok' } },
          report_fan_out: {
            output: {
              failed: 1,
              results: [
                { output: { outcome: 'completed' }, status: 'completed' },
                { output: { outcome: 'partial' }, status: 'completed' },
                { status: 'failed' },
              ],
            },
          },
          resolve_index_scope_gate: { output: { index_scope_blocked: false } },
          select_candidate_reports: { output: { ids: ['r-1', 'r-2', 'r-3'] } },
        },
      },
      {
        steps: {
          check_index_scope: { output: { status: 'blocked' } },
          resolve_index_scope_gate: { output: { index_scope_blocked: true } },
        },
      },
    ],
    workerId: SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
    workflowId: ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID,
  },
  {
    contexts: [
      {
        inputs: {
          hasConfirmedHit: false,
          huntStatus: 'success',
          investigationConversationId: INVESTIGATION_ID,
          tier2_invoked: true,
        },
        steps: {
          decide_and_package: {
            output: {
              coverage: { skipped: [], written: [{ kiId: 'ki-1' }] },
              dismiss: true,
              mintSuppression: 'none',
              proposals: [],
              status: 'packaged',
            },
          },
          dismiss_investigation_if_clean: { output: CHANGED_STATUS },
        },
        variables: {
          dismiss_close_failed: false,
          dispatch_failed_count: 0,
          package_status: 'success',
        },
      },
      {
        inputs: {
          hasConfirmedHit: true,
          huntStatus: 'partial',
          investigationConversationId: INVESTIGATION_ID,
        },
        steps: {},
        variables: {
          dismiss_close_failed: false,
          dispatch_failed_count: 0,
          package_status: 'run_incomplete',
        },
      },
    ],
    workerId: SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
    workflowId: ALERTZERO_HUNT_PACKAGE_REPORT_WORKFLOW_ID,
  },
  {
    contexts: [
      {
        inputs: { investigationConversationId: INVESTIGATION_ID },
        steps: { close_if_settled: { output: CHANGED_STATUS } },
      },
    ],
    workerId: SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
    workflowId: ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW_ID,
  },
];
