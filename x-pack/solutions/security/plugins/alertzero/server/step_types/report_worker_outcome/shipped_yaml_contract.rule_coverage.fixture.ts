/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTZERO_COVERAGE_REVIEW_WORKFLOW_ID,
  ALERTZERO_COVERAGE_WORKER_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID } from '@kbn/alertzero-common';
import type { WorkerWorkflowContract } from './shipped_yaml_contract.test_helpers';
import { CHANGED_STATUS, OPENED_INVESTIGATION } from './shipped_yaml_contract.test_helpers';

/**
 * The Rule Coverage Worker's workflows with report steps, and runs where every report step's guard
 * passes, the way the engine would have them.
 */
export const SHIPPED_YAML_CONTRACTS: WorkerWorkflowContract[] = [
  {
    contexts: [
      {
        consts: { no_rows: [] },
        steps: {
          collect_active_indicators: { output: { count: 2 } },
          list_active_reviews: { output: { results: [] } },
          resolve_dispatch_batch: { output: { indicators: [{ _id: 'ki-1' }] } },
          search_pending_indicators: { output: { hits: { total: { value: 6 } } } },
        },
      },
      {
        consts: { no_rows: [] },
        steps: {
          collect_active_indicators: { output: { count: 100 } },
          resolve_dispatch_batch: { output: { indicators: [] } },
          search_pending_indicators: { output: { hits: { total: { value: 6 } } } },
        },
      },
      {
        consts: { no_rows: [] },
        steps: { search_pending_indicators: { error: { message: 'search failed' } } },
      },
    ],
    workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
    workflowId: ALERTZERO_COVERAGE_WORKER_WORKFLOW_ID,
  },
  {
    contexts: [
      {
        steps: {
          close_investigation_resolved: { output: CHANGED_STATUS },
          coverage_check: { output: { structured_output: { verdict: 'covered_disabled' } } },
          create_investigation: OPENED_INVESTIGATION,
          mark_processed: { output: { result: 'updated' } },
          propose_enable: { output: { decision: 'approved', status: 'succeeded' } },
          record_decision: { output: { applied: true, approved: true, dismissed: false } },
          refetch_rule: { output: { enabled: true, type: 'eql' } },
          resolve_rule: { output: { enabled: false, immutable: false, type: 'eql' } },
          resolve_outcome: {
            output: { enable_approved_not_applied: false, install_approved_not_applied: false },
          },
        },
      },
      {
        steps: {
          close_investigation_dismissed: { output: CHANGED_STATUS },
          coverage_check: { output: { structured_output: { verdict: 'no_coverage' } } },
          create_investigation: OPENED_INVESTIGATION,
          record_decision: { output: { applied: false, approved: false, dismissed: true } },
          run_rule_creation: {
            output: { created: false, decision: 'dismissed', skip_reason: '' },
          },
        },
      },
      {
        steps: {
          close_investigation_no_rule: { output: CHANGED_STATUS },
          coverage_check: { output: { structured_output: { verdict: 'no_coverage' } } },
          create_investigation: OPENED_INVESTIGATION,
          mark_processed: { output: { result: 'updated' } },
          record_decision: { output: { applied: false, approved: false, dismissed: false } },
          resolve_outcome: { output: { creation_no_rule: true } },
          run_rule_creation: {
            output: {
              created: false,
              no_rule: true,
              reviewed: false,
              skip_reason: 'No data source exists for the gap.',
            },
          },
        },
      },
      {
        steps: {
          close_investigation_retry: { output: CHANGED_STATUS },
          coverage_check: { output: { structured_output: { verdict: 'no_coverage' } } },
          create_investigation: OPENED_INVESTIGATION,
          record_decision: { output: { applied: false, approved: false, dismissed: false } },
          resolve_outcome: { output: { creation_retry: true } },
          run_rule_creation: {
            output: {
              created: false,
              no_rule: false,
              proposed: false,
              reviewed: false,
              skip_reason: 'The interval was a placeholder.',
            },
          },
        },
      },
      { steps: { read_ki: { output: { hits: { total: { value: 0 } } } } } },
      {
        steps: {
          close_investigation_declined: { output: CHANGED_STATUS },
          create_investigation: OPENED_INVESTIGATION,
          propose_entry: { output: { decision: 'dismissed', status: 'no_action' } },
        },
      },
    ],
    workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
    workflowId: ALERTZERO_COVERAGE_REVIEW_WORKFLOW_ID,
  },
];
