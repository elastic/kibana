/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OriginalWorkflow, OriginalWorkflowVendor, WorkflowMigrationSource } from './types';

describe('OriginalWorkflowVendor', () => {
  it('accepts Tines as the current workflow migration source', () => {
    expect(OriginalWorkflowVendor.parse(WorkflowMigrationSource.TINES)).toBe(
      WorkflowMigrationSource.TINES
    );
  });

  it('rejects rule/dashboard vendors that are not workflow sources', () => {
    expect(() => OriginalWorkflowVendor.parse('splunk')).toThrow();
    expect(() => OriginalWorkflowVendor.parse('tines-poc')).toThrow();
  });
});

describe('OriginalWorkflow', () => {
  it('stores vendor from WorkflowMigrationSource instead of a Tines-only literal', () => {
    const originalWorkflow = OriginalWorkflow.parse({
      id: 'story-1',
      vendor: WorkflowMigrationSource.TINES,
      title: 'Example story',
      data: { name: 'Example story' },
    });

    expect(originalWorkflow.vendor).toBe(WorkflowMigrationSource.TINES);
  });
});
