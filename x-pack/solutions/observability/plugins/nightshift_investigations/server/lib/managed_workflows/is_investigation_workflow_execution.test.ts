/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID,
  NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { isInvestigationWorkflowExecution } from './is_investigation_workflow_execution';

describe('isInvestigationWorkflowExecution', () => {
  it('accepts runs of the global investigation', () => {
    expect(
      isInvestigationWorkflowExecution({ workflowId: NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID })
    ).toBe(true);
    expect(
      isInvestigationWorkflowExecution({
        workflowId: 'copy',
        originManagedWorkflowId: NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID,
      })
    ).toBe(true);
  });

  it("accepts runs of a space's entry point", () => {
    expect(
      isInvestigationWorkflowExecution({
        workflowId: `${NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID}-obs`,
        originManagedWorkflowId: NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID,
      })
    ).toBe(true);
  });

  it('rejects runs of other workflows', () => {
    expect(isInvestigationWorkflowExecution({ workflowId: 'other' })).toBe(false);
    expect(
      isInvestigationWorkflowExecution({
        workflowId: `${NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID}-obs`,
      })
    ).toBe(false);
  });
});
