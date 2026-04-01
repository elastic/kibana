/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';

import { AttackDiscoveryError } from '../../errors/attack_discovery_error';
import { ATTACK_DISCOVERY_STEP_FAILURE_EVENT } from '../event_based_telemetry';
import { classifyErrorCategory, reportStepFailure } from '.';

const mockAnalytics = coreMock.createSetup().analytics;
const mockLogger = loggingSystemMock.createLogger();

describe('classifyErrorCategory', () => {
  it('returns timeout for timeout errors', () => {
    expect(classifyErrorCategory(new Error('Request timed out after 30s'))).toBe('timeout');
  });

  it('returns timeout for "timed out" message', () => {
    expect(classifyErrorCategory(new Error('Connection timed out'))).toBe('timeout');
  });

  it('returns connector_error for connector errors', () => {
    expect(classifyErrorCategory(new Error('Connector not found: abc-123'))).toBe(
      'connector_error'
    );
  });

  it('returns validation_error for validation errors', () => {
    expect(classifyErrorCategory(new Error('Validation failed: invalid schema'))).toBe(
      'validation_error'
    );
  });

  it('returns validation_error for validate-related messages', () => {
    expect(classifyErrorCategory(new Error('Failed to validate discoveries'))).toBe(
      'validation_error'
    );
  });

  it('returns workflow_error for workflow errors', () => {
    expect(classifyErrorCategory(new Error('Workflow execution failed'))).toBe('workflow_error');
  });

  it('returns rate_limit for 429 status', () => {
    expect(classifyErrorCategory(new Error('Request failed with status 429'))).toBe('rate_limit');
  });

  it('returns rate_limit for rate limit message', () => {
    expect(classifyErrorCategory(new Error('rate limit exceeded'))).toBe('rate_limit');
  });

  it('returns rate_limit for too many requests', () => {
    expect(classifyErrorCategory(new Error('Too many requests'))).toBe('rate_limit');
  });

  it('returns network_error for ECONNREFUSED', () => {
    expect(classifyErrorCategory(new Error('connect ECONNREFUSED 127.0.0.1:9200'))).toBe(
      'network_error'
    );
  });

  it('returns network_error for ENOTFOUND', () => {
    expect(classifyErrorCategory(new Error('getaddrinfo ENOTFOUND host.example.com'))).toBe(
      'network_error'
    );
  });

  it('returns network_error for socket hang up', () => {
    expect(classifyErrorCategory(new Error('socket hang up'))).toBe('network_error');
  });

  it('returns network_error for fetch failed', () => {
    expect(classifyErrorCategory(new Error('fetch failed'))).toBe('network_error');
  });

  it('returns network_error for ETIMEDOUT', () => {
    expect(classifyErrorCategory(new Error('connect ETIMEDOUT 10.0.0.1:443'))).toBe(
      'network_error'
    );
  });

  it('returns permission_error for forbidden', () => {
    expect(classifyErrorCategory(new Error('forbidden: access denied'))).toBe('permission_error');
  });

  it('returns permission_error for 403 status', () => {
    expect(classifyErrorCategory(new Error('Request failed with status 403'))).toBe(
      'permission_error'
    );
  });

  it('returns permission_error for unauthorized', () => {
    expect(classifyErrorCategory(new Error('unauthorized'))).toBe('permission_error');
  });

  it('returns permission_error for 401 status', () => {
    expect(classifyErrorCategory(new Error('Request failed with status 401'))).toBe(
      'permission_error'
    );
  });

  it('returns permission_error for insufficient privileges', () => {
    expect(classifyErrorCategory(new Error('insufficient privileges to perform this action'))).toBe(
      'permission_error'
    );
  });

  it('returns permission_error for security_exception', () => {
    expect(classifyErrorCategory(new Error('security_exception: action is unauthorized'))).toBe(
      'permission_error'
    );
  });

  it('returns concurrent_conflict for 409 status', () => {
    expect(classifyErrorCategory(new Error('Request failed with status 409'))).toBe(
      'concurrent_conflict'
    );
  });

  it('returns concurrent_conflict for version_conflict', () => {
    expect(classifyErrorCategory(new Error('version_conflict_engine_exception'))).toBe(
      'concurrent_conflict'
    );
  });

  it('returns concurrent_conflict for conflict', () => {
    expect(classifyErrorCategory(new Error('document update conflict'))).toBe(
      'concurrent_conflict'
    );
  });

  it('returns concurrent_conflict for was cancelled', () => {
    expect(classifyErrorCategory(new Error('execution was cancelled by a newer request'))).toBe(
      'concurrent_conflict'
    );
  });

  it('returns cluster_health for no_shard_available', () => {
    expect(classifyErrorCategory(new Error('no_shard_available_action_exception'))).toBe(
      'cluster_health'
    );
  });

  it('returns cluster_health for cluster_block', () => {
    expect(classifyErrorCategory(new Error('cluster_block_exception: blocked by index'))).toBe(
      'cluster_health'
    );
  });

  it('returns cluster_health for circuit_breaking_exception', () => {
    expect(
      classifyErrorCategory(new Error('circuit_breaking_exception: heap usage exceeded'))
    ).toBe('cluster_health');
  });

  it('returns cluster_health for es_rejected_execution', () => {
    expect(classifyErrorCategory(new Error('es_rejected_execution_exception: queue full'))).toBe(
      'cluster_health'
    );
  });

  it('returns anonymization_error for anonymization messages', () => {
    expect(classifyErrorCategory(new Error('anonymization fields could not be resolved'))).toBe(
      'anonymization_error'
    );
  });

  it('returns step_registration_error for not registered', () => {
    expect(classifyErrorCategory(new Error('step handler not registered'))).toBe(
      'step_registration_error'
    );
  });

  it('returns step_registration_error for unknown step', () => {
    expect(classifyErrorCategory(new Error('unknown step: my.custom.step'))).toBe(
      'step_registration_error'
    );
  });

  it('returns step_registration_error for step type messages', () => {
    expect(classifyErrorCategory(new Error('step type "foo.bar" is not available'))).toBe(
      'step_registration_error'
    );
  });

  it('returns workflow_disabled for is not enabled', () => {
    expect(classifyErrorCategory(new Error('workflow is not enabled in this space'))).toBe(
      'workflow_disabled'
    );
  });

  it('returns workflow_disabled for is disabled', () => {
    expect(classifyErrorCategory(new Error('Attack Discovery is disabled'))).toBe(
      'workflow_disabled'
    );
  });

  it('returns workflow_deleted for not found + workflow', () => {
    expect(classifyErrorCategory(new Error('workflow abc-123 not found'))).toBe('workflow_deleted');
  });

  it('returns workflow_invalid for is not valid', () => {
    expect(classifyErrorCategory(new Error('workflow configuration is not valid'))).toBe(
      'workflow_invalid'
    );
  });

  it('returns workflow_invalid for missing a definition', () => {
    expect(classifyErrorCategory(new Error('step is missing a definition'))).toBe(
      'workflow_invalid'
    );
  });

  it('returns workflow_invalid for has no definition', () => {
    expect(classifyErrorCategory(new Error('workflow has no definition'))).toBe('workflow_invalid');
  });

  it('returns workflow_invalid for no step definitions', () => {
    expect(classifyErrorCategory(new Error('no step definitions found in workflow'))).toBe(
      'workflow_invalid'
    );
  });

  it('returns unknown for unrecognized errors', () => {
    expect(classifyErrorCategory(new Error('Something went wrong'))).toBe('unknown');
  });

  it('handles non-Error values', () => {
    expect(classifyErrorCategory('string error')).toBe('unknown');
  });

  it('handles non-Error values with keyword', () => {
    expect(classifyErrorCategory('connection timeout')).toBe('timeout');
  });

  it('returns error.errorCategory directly for AttackDiscoveryError', () => {
    const error = new AttackDiscoveryError({
      errorCategory: 'permission_error',
      message: 'not authorized',
    });

    expect(classifyErrorCategory(error)).toBe('permission_error');
  });

  it('prefers AttackDiscoveryError.errorCategory over message-based classification', () => {
    // Message would normally classify as timeout, but errorCategory says connector_error
    const error = new AttackDiscoveryError({
      errorCategory: 'connector_error',
      message: 'Request timed out',
    });

    expect(classifyErrorCategory(error)).toBe('connector_error');
  });
});

describe('reportStepFailure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports a step failure event with all fields', () => {
    reportStepFailure({
      analytics: mockAnalytics,
      logger: mockLogger,
      params: {
        duration_ms: 5000,
        error_category: 'timeout',
        execution_uuid: 'exec-uuid-123',
        step: 'alert_retrieval',
        workflow_id: 'workflow-abc',
      },
    });

    expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
      ATTACK_DISCOVERY_STEP_FAILURE_EVENT.eventType,
      {
        duration_ms: 5000,
        error_category: 'timeout',
        execution_uuid: 'exec-uuid-123',
        step: 'alert_retrieval',
        workflow_id: 'workflow-abc',
      }
    );
  });

  it('reports a step failure event with only required fields', () => {
    reportStepFailure({
      analytics: mockAnalytics,
      logger: mockLogger,
      params: {
        error_category: 'unknown',
        step: 'generation',
      },
    });

    expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
      ATTACK_DISCOVERY_STEP_FAILURE_EVENT.eventType,
      {
        error_category: 'unknown',
        step: 'generation',
      }
    );
  });

  it('reports a validation step failure', () => {
    reportStepFailure({
      analytics: mockAnalytics,
      logger: mockLogger,
      params: {
        duration_ms: 12000,
        error_category: 'validation_error',
        execution_uuid: 'exec-uuid-456',
        step: 'validation',
        workflow_id: 'validation-workflow-id',
      },
    });

    expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
      ATTACK_DISCOVERY_STEP_FAILURE_EVENT.eventType,
      {
        duration_ms: 12000,
        error_category: 'validation_error',
        execution_uuid: 'exec-uuid-456',
        step: 'validation',
        workflow_id: 'validation-workflow-id',
      }
    );
  });

  it('logs debug message when reportEvent throws', () => {
    mockAnalytics.reportEvent.mockImplementationOnce(() => {
      throw new Error('analytics failure');
    });

    reportStepFailure({
      analytics: mockAnalytics,
      logger: mockLogger,
      params: {
        error_category: 'unknown',
        step: 'generation',
      },
    });

    expect(mockLogger.debug).toHaveBeenCalled();
  });
});
