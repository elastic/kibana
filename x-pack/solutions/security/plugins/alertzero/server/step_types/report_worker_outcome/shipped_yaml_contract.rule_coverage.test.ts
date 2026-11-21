/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTZERO_COVERAGE_WORKER_WORKFLOW_ID } from '@kbn/workflows/managed';
import { SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID } from '@kbn/alertzero-common';
import {
  ENVELOPE_FIELDS,
  describeWorkerWorkflowContracts,
  reportNamed,
  reportOnDevModeClient,
  reportStepsOf,
} from './shipped_yaml_contract.test_helpers';
import { SHIPPED_YAML_CONTRACTS } from './shipped_yaml_contract.rule_coverage.fixture';

describe('shipped Rule Coverage Worker YAML and the reportWorkerOutcome schema', () => {
  describeWorkerWorkflowContracts(SHIPPED_YAML_CONTRACTS);

  describe('as the debug log prints them', () => {
    it('reports a Rule Coverage sweep that started reviews', () => {
      expect(
        reportOnDevModeClient(
          reportNamed(
            reportStepsOf(ALERTZERO_COVERAGE_WORKER_WORKFLOW_ID),
            'report_worker_run_completed'
          ),
          {
            consts: { no_rows: [] },
            steps: {
              collect_active_indicators: { output: { count: 2 } },
              list_active_reviews: { output: { results: [] } },
              resolve_dispatch_batch: {
                output: { indicators: [{ _id: 'ki-1' }, { _id: 'ki-2' }] },
              },
              search_pending_indicators: { output: { hits: { total: { value: 6 } } } },
            },
          },
          SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID
        )
      ).toEqual({
        eventType: 'alertzero_worker_run_completed',
        payload: {
          ...ENVELOPE_FIELDS,
          watch_tag: 'watch-detection',
          worker_id: 'system-security-detection-rule-coverage',
          candidates_found: 6,
          degraded: false,
          degraded_reason: 'none',
          items_dispatched: 2,
          items_failed: 0,
          items_in_flight: 4,
          lookup_failed: false,
          run_outcome: 'produced',
          source_read_failed: false,
        },
      });
    });
  });
});
