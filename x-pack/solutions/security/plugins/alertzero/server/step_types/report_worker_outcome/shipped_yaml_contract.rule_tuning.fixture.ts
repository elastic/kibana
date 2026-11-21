/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID,
  ALERTZERO_RULE_TUNING_WORKER_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID } from '@kbn/alertzero-common';
import type { WorkerWorkflowContract } from './shipped_yaml_contract.test_helpers';
import { CHANGED_STATUS, OPENED_INVESTIGATION } from './shipped_yaml_contract.test_helpers';

/**
 * The Rule Tuning Worker's workflows with report steps, and runs where every report step's guard
 * passes, the way the engine would have them.
 */
export const SHIPPED_YAML_CONTRACTS: WorkerWorkflowContract[] = [
  {
    contexts: [
      {
        consts: { no_rows: [] },
        steps: {
          collect_active_rules: { output: { expected: 1 } },
          harvest_fp_alerts_by_rule: { output: { values: [] } },
          list_active_reviews: { output: { results: [] } },
          list_enabled_rules: { output: { data: [] } },
          resolve_enabled_rules: { output: { rule_revision_keys: ',' } },
          resolve_fanout_rows: { output: { rows: [['rule-1'], ['rule-2']] } },
          resolve_screened_rules: { output: { count: 2 } },
          resolve_read_failure: { output: { failed: false } },
          screen_rule_fp_rates: { output: { values: [] } },
        },
      },
      {
        consts: { no_rows: [] },
        steps: {
          harvest_fp_alerts_by_rule: { error: { message: 'search failed' } },
          list_active_reviews: { error: { message: 'HTTP 500' } },
          resolve_read_failure: { output: { failed: true } },
        },
      },
      {
        consts: { no_rows: [] },
        steps: {
          list_enabled_rules: { error: { message: 'HTTP 500' } },
          resolve_read_failure: { output: { failed: true } },
        },
      },
      {
        consts: { no_rows: [] },
        steps: {
          resolve_read_failure: { output: { failed: true } },
          screen_rule_fp_rates: { error: { message: 'search failed' } },
        },
      },
      {
        consts: { no_rows: [] },
        steps: {
          list_enabled_rules: { output: { data: [], total: 10001 } },
          resolve_enabled_rules: { output: { rule_revision_keys: ',', truncated: true } },
          resolve_fanout_rows: { output: { rows: [['rule-1']] } },
          resolve_read_failure: { output: { failed: false } },
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
];
