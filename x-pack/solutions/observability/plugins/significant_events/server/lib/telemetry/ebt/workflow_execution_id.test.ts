/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { getWorkflowExecutionIdFromRequest } from './workflow_execution_id';

const request = (isInternalApiRequest: boolean): KibanaRequest =>
  ({
    isInternalApiRequest,
    headers: { 'x-kibana-workflow-execution-id': 'workflow-run-1' },
  } as KibanaRequest);

describe('getWorkflowExecutionIdFromRequest', () => {
  it('reads provenance from an internal Workflow Engine request', () => {
    expect(getWorkflowExecutionIdFromRequest(request(true))).toBe('workflow-run-1');
  });

  it('ignores a workflow header on an external request', () => {
    expect(getWorkflowExecutionIdFromRequest(request(false))).toBeUndefined();
  });
});
