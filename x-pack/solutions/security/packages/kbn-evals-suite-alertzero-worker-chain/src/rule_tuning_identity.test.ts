/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionDto } from '@kbn/workflows';
import { assertReviewConnector, assertRuleTuningIdentity } from './rule_tuning_identity';

const execution = (effectiveIdentity?: WorkflowExecutionDto['effectiveIdentity']) =>
  ({ executedBy: 'operator', effectiveIdentity } as WorkflowExecutionDto);

describe('assertRuleTuningIdentity', () => {
  it('accepts a review whose effective identity is the worker service account', () => {
    expect(
      assertRuleTuningIdentity(
        execution({ type: 'service_account', id: 'kibana/alertzero_rule_tuning' }),
        'kibana/alertzero_rule_tuning'
      )
    ).toBe('kibana/alertzero_rule_tuning');
  });

  it('rejects a review that carries no effective identity, even if an operator ran it', () => {
    expect(() =>
      assertRuleTuningIdentity(execution(undefined), 'kibana/alertzero_rule_tuning')
    ).toThrow('did not execute as its worker service account');
  });

  it('rejects a review that ran as a different service account', () => {
    expect(() =>
      assertRuleTuningIdentity(
        execution({ type: 'service_account', id: 'kibana/alertzero_alert_triage' }),
        'kibana/alertzero_rule_tuning'
      )
    ).toThrow('did not execute as its worker service account');
  });
});

describe('assertReviewConnector', () => {
  const withConnector = (connectorId?: string) =>
    ({
      stepExecutions: [
        { stepId: 'diagnose_rule', output: { metadata: { usage: { connectorId } } } },
      ],
    } as unknown as WorkflowExecutionDto);

  it('accepts the candidate connector', () => {
    expect(assertReviewConnector(withConnector('candidate'), 'candidate')).toBe('candidate');
  });

  it('reads the connector from the agent step, not its step_level_timeout wrapper', () => {
    const execution = {
      stepExecutions: [
        { stepId: 'diagnose_rule', stepType: 'step_level_timeout', output: null },
        {
          stepId: 'diagnose_rule',
          stepType: 'ai.agent',
          output: { metadata: { usage: { connectorId: 'candidate' } } },
        },
      ],
    } as unknown as WorkflowExecutionDto;
    expect(assertReviewConnector(execution, 'candidate')).toBe('candidate');
  });

  it('rejects another connector, naming both', () => {
    expect(() => assertReviewConnector(withConnector('.claude-5'), 'candidate')).toThrow(
      '.claude-5, not the candidate candidate'
    );
  });

  it('rejects a step that reports no connector', () => {
    expect(() => assertReviewConnector(withConnector(undefined), 'candidate')).toThrow(
      'none reported'
    );
    expect(() => assertReviewConnector({} as WorkflowExecutionDto, 'candidate')).toThrow(
      'none reported'
    );
  });

  describe('when diagnose_rule reports no connector', () => {
    const review = (steps: unknown[], status = 'completed') =>
      ({ status, stepExecutions: steps } as unknown as WorkflowExecutionDto);

    it('names a skipped step and the disabled rule that gated it', () => {
      const execution = review([
        { stepId: 'fetch_rule', status: 'completed', output: { enabled: false } },
        { stepId: 'diagnose_rule', status: 'skipped' },
      ]);
      expect(() => assertReviewConnector(execution, 'candidate')).toThrow(
        'diagnose_rule: skipped; fetch_rule: completed; fetch_rule.output.enabled: false; review: completed'
      );
    });

    it('names a failed rule fetch with its error', () => {
      const execution = review(
        [
          { stepId: 'fetch_rule', status: 'failed', error: { message: 'rule not found' } },
          { stepId: 'diagnose_rule', status: 'skipped' },
        ],
        'failed'
      );
      expect(() => assertReviewConnector(execution, 'candidate')).toThrow(
        'fetch_rule: failed (error: rule not found); fetch_rule.output.enabled: (absent); review: failed'
      );
    });

    it('names a diagnose_rule that failed before any model round', () => {
      const execution = review([
        { stepId: 'fetch_rule', status: 'completed', output: { enabled: true } },
        { stepId: 'diagnose_rule', status: 'failed', error: { message: 'connector not found' } },
      ]);
      expect(() => assertReviewConnector(execution, 'candidate')).toThrow(
        'diagnose_rule: failed (error: connector not found); fetch_rule: completed; fetch_rule.output.enabled: true'
      );
    });

    it('still fails a completed step that ran on the wrong connector without the no-call hint', () => {
      const execution = review([
        { stepId: 'diagnose_rule', status: 'completed', output: { metadata: { usage: { connectorId: '.other' } } } },
      ]);
      expect(() => assertReviewConnector(execution, 'candidate')).toThrow(
        'ran on connector .other, not the candidate candidate'
      );
      expect(() => assertReviewConnector(execution, 'candidate')).not.toThrow('no model call');
    });
  });
});
