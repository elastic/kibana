/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTZERO_COVERAGE_REVIEW_WORKFLOW_ID,
  ALERTZERO_COVERAGE_WORKER_WORKFLOW_ID,
  ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID,
  ALERTZERO_RULE_TUNING_WORKER_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import {
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
} from '@kbn/alertzero-common';
import type { WorkerWorkflowContract } from './shipped_yaml_contract.test_helpers';
import { CHANGED_STATUS, OPENED_INVESTIGATION } from './shipped_yaml_contract.test_helpers';

/**
 * The Rule Tuning and Rule Coverage Workers' workflows with report steps, and runs where every
 * report step's guard passes, the way the engine would have them.
 */
export const SHIPPED_YAML_CONTRACTS: WorkerWorkflowContract[] = [
  {
    contexts: [
      {
        consts: { no_rows: [] },
        steps: {
          collect_active_rules: { output: { expected: 1 } },
          collect_candidates: { output: { count: 3 } },
          harvest_fp_alerts_by_rule: { output: { values: [] } },
          list_active_reviews: { output: { results: [] } },
          resolve_fanout_rows: { output: { rows: [['rule-1'], ['rule-2']] } },
        },
      },
      {
        consts: { no_rows: [] },
        steps: {
          harvest_fp_alerts_by_rule: { error: { message: 'search failed' } },
          list_active_reviews: { error: { message: 'HTTP 500' } },
        },
      },
    ],
    workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
    workflowId: ALERTZERO_RULE_TUNING_WORKER_WORKFLOW_ID,
  },
  {
    contexts: [
      {
        steps: {
          close_investigation_declined: { output: CHANGED_STATUS },
          create_investigation: OPENED_INVESTIGATION,
        },
      },
      {
        steps: {
          close_investigation_applied: { output: CHANGED_STATUS },
          create_investigation: OPENED_INVESTIGATION,
          diagnose_rule: {
            output: { structured_output: { change_type: 'query', confidence: 'low' } },
          },
          fetch_rule: {
            output: { enabled: true, rule_source: { type: 'external' }, type: 'machine_learning' },
          },
          propose_query: { output: { decision: 'approved', status: 'succeeded' } },
          record_preview_outcome: {
            output: {
              current_alert_count: 4,
              current_succeeded: true,
              proposed_alert_count: 1,
              proposed_succeeded: true,
            },
          },
          record_proposal_action_decision: {
            output: { applied: true, approved: true, dismissed: false },
          },
        },
      },
      {
        steps: {
          close_investigation_dismissed: { output: CHANGED_STATUS },
          create_investigation: OPENED_INVESTIGATION,
          diagnose_rule: { output: { structured_output: { change_type: 'other' } } },
          fetch_rule: { output: { enabled: true, type: 'a_type_added_later' } },
          propose_manual: { output: { decision: 'dismissed', status: 'no_action' } },
          record_proposal_action_decision: {
            output: { applied: false, approved: false, dismissed: true },
          },
        },
      },
      { steps: { fetch_rule: { error: { message: 'HTTP 404: not found' } } } },
    ],
    workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
    workflowId: ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID,
  },
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
