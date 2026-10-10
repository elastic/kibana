/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionDto } from '@kbn/workflows';
import { assertRuleTuningIdentity } from './rule_tuning_identity';

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
