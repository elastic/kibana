/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID } from '@kbn/workflows/managed';
import { SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID } from '@kbn/alertzero-common';
import {
  ENVELOPE_FIELDS,
  INVESTIGATION_ID,
  describeWorkerWorkflowContracts,
  reportNamed,
  reportOnDevModeClient,
  reportStepsOf,
} from './shipped_yaml_contract.test_helpers';
import { SHIPPED_YAML_CONTRACTS } from './shipped_yaml_contract.rule_tuning.fixture';

describe('shipped Rule Tuning Worker YAML and the reportWorkerOutcome schema', () => {
  describeWorkerWorkflowContracts(SHIPPED_YAML_CONTRACTS);

  describe('as the debug log prints them', () => {
    it('reports a Rule Tuning review whose approved query change was applied', () => {
      expect(
        reportOnDevModeClient(
          reportNamed(
            reportStepsOf(ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID),
            'report_review_completed'
          ),
          {
            steps: {
              create_investigation: { output: { conversation_id: INVESTIGATION_ID } },
              diagnose_rule: {
                output: { structured_output: { change_type: 'query', confidence: 'high' } },
              },
              fetch_rule: {
                output: { enabled: true, rule_source: { type: 'internal' }, type: 'saved_query' },
              },
              propose_query: { output: { decision: 'approved', status: 'succeeded' } },
              record_preview_outcome: {
                output: {
                  current_alert_count: 12,
                  current_succeeded: true,
                  proposed_alert_count: 3,
                  proposed_succeeded: true,
                },
              },
              record_proposal_action_decision: {
                output: { applied: true, approved: true, dismissed: false },
              },
              resolve_applied: { output: { landed: true } },
            },
          },
          SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID
        )
      ).toEqual({
        eventType: 'alertzero_rule_tuning_review_completed',
        payload: {
          ...ENVELOPE_FIELDS,
          watch_tag: 'watch-detection',
          worker_id: 'system-security-detection-rule-tuning',
          applied: true,
          approved_not_applied: false,
          backtest_ran: true,
          backtest_reduced_alerts: true,
          change_type: 'query',
          confidence: 'high',
          decision: 'approved',
          entry_gate: 'skipped',
          investigation_id: INVESTIGATION_ID,
          rule_source: 'custom',
          // The YAML sends the rule's own `saved_query`; the step maps it.
          rule_type: 'query',
          rule_unavailable: false,
        },
      });
    });
  });
});
