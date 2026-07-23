/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttackDiscoveryError } from '.';

describe('AttackDiscoveryError', () => {
  it('is an instance of Error', () => {
    const error = new AttackDiscoveryError({
      errorCategory: 'timeout',
      message: 'Request timed out',
    });

    expect(error instanceof Error).toBe(true);
  });

  it('is an instance of AttackDiscoveryError', () => {
    const error = new AttackDiscoveryError({
      errorCategory: 'timeout',
      message: 'Request timed out',
    });

    expect(error instanceof AttackDiscoveryError).toBe(true);
  });

  it('sets the message correctly', () => {
    const error = new AttackDiscoveryError({
      errorCategory: 'connector_error',
      message: 'Connector not available',
    });

    expect(error.message).toBe('Connector not available');
  });

  it('sets the name to AttackDiscoveryError', () => {
    const error = new AttackDiscoveryError({
      errorCategory: 'unknown',
      message: 'Something failed',
    });

    expect(error.name).toBe('AttackDiscoveryError');
  });

  it('sets the errorCategory correctly', () => {
    const error = new AttackDiscoveryError({
      errorCategory: 'validation_error',
      message: 'Validation failed',
    });

    expect(error.errorCategory).toBe('validation_error');
  });

  it('sets workflowId when provided', () => {
    const error = new AttackDiscoveryError({
      errorCategory: 'workflow_error',
      message: 'Workflow failed',
      workflowId: 'workflow-abc-123',
    });

    expect(error.workflowId).toBe('workflow-abc-123');
  });

  it('leaves workflowId undefined when not provided', () => {
    const error = new AttackDiscoveryError({
      errorCategory: 'network_error',
      message: 'Network unreachable',
    });

    expect(error.workflowId).toBeUndefined();
  });

  it('supports all ErrorCategory values', () => {
    const categories = [
      'anonymization_error',
      'cluster_health',
      'concurrent_conflict',
      'connector_error',
      'network_error',
      'permission_error',
      'rate_limit',
      'step_registration_error',
      'timeout',
      'unknown',
      'validation_error',
      'workflow_deleted',
      'workflow_disabled',
      'workflow_error',
      'workflow_invalid',
    ] as const;

    for (const category of categories) {
      const error = new AttackDiscoveryError({ errorCategory: category, message: 'test' });
      expect(error.errorCategory).toBe(category);
    }
  });
});
