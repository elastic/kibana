/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { classifyErrorCategory } from '.';

describe('classifyErrorCategory', () => {
  describe('workflow_disabled', () => {
    it('returns workflow_disabled for "is not enabled" pattern', () => {
      expect(classifyErrorCategory('Alert retrieval workflow is not enabled: wf-abc')).toBe(
        'workflow_disabled'
      );
    });

    it('returns workflow_disabled for "Generation workflow is not enabled" pattern', () => {
      expect(classifyErrorCategory('Generation workflow is not enabled: wf-gen-123')).toBe(
        'workflow_disabled'
      );
    });

    it('returns workflow_disabled for "Validation workflow is not enabled" pattern', () => {
      expect(classifyErrorCategory('Validation workflow is not enabled: wf-val-456')).toBe(
        'workflow_disabled'
      );
    });

    it('returns workflow_disabled for "is disabled" pattern', () => {
      expect(classifyErrorCategory("Workflow 'wf-abc' is disabled")).toBe('workflow_disabled');
    });

    it('is case-insensitive', () => {
      expect(classifyErrorCategory("Workflow 'wf-abc' IS DISABLED")).toBe('workflow_disabled');
    });
  });

  describe('workflow_deleted', () => {
    it('returns workflow_deleted for "Workflow not found" pattern', () => {
      expect(classifyErrorCategory("Workflow 'wf-abc' not found")).toBe('workflow_deleted');
    });

    it('is case-insensitive', () => {
      expect(classifyErrorCategory("WORKFLOW 'wf-abc' NOT FOUND")).toBe('workflow_deleted');
    });
  });

  describe('workflow_invalid', () => {
    it('returns workflow_invalid for "is not valid" pattern', () => {
      expect(classifyErrorCategory("Workflow 'wf-abc' is not valid")).toBe('workflow_invalid');
    });

    it('returns workflow_invalid for "missing a definition" pattern', () => {
      expect(classifyErrorCategory("Workflow 'wf-abc' is missing a definition")).toBe(
        'workflow_invalid'
      );
    });

    it('is case-insensitive', () => {
      expect(classifyErrorCategory("WORKFLOW 'WF-ABC' IS NOT VALID")).toBe('workflow_invalid');
    });

    // BUG-1: Generation phase "has no definition"
    it('returns workflow_invalid for "has no definition" pattern (BUG-1)', () => {
      expect(classifyErrorCategory('Generation workflow has no definition: wf-gen-123')).toBe(
        'workflow_invalid'
      );
    });

    // BUG-2: Validation phase "has no definition"
    it('returns workflow_invalid for "has no definition" in validation phase (BUG-2)', () => {
      expect(classifyErrorCategory('Validation workflow has no definition: wf-val-456')).toBe(
        'workflow_invalid'
      );
    });

    // BUG-3: Alert retrieval "no step definitions"
    it('returns workflow_invalid for "no step definitions" pattern (BUG-3)', () => {
      expect(classifyErrorCategory('Alert retrieval workflow has no step definitions')).toBe(
        'workflow_invalid'
      );
    });
  });

  describe('rate_limit', () => {
    it('returns rate_limit for "429" pattern', () => {
      expect(classifyErrorCategory('HTTP 429 Too Many Requests')).toBe('rate_limit');
    });

    it('returns rate_limit for "rate limit" pattern', () => {
      expect(classifyErrorCategory('You have exceeded the rate limit')).toBe('rate_limit');
    });

    it('returns rate_limit for "too many requests" pattern', () => {
      expect(classifyErrorCategory('Too many requests from this IP')).toBe('rate_limit');
    });

    it('is case-insensitive', () => {
      expect(classifyErrorCategory('RATE LIMIT EXCEEDED')).toBe('rate_limit');
    });
  });

  describe('network_error', () => {
    it('returns network_error for "ECONNREFUSED" pattern', () => {
      expect(classifyErrorCategory('connect ECONNREFUSED 127.0.0.1:9200')).toBe('network_error');
    });

    it('returns network_error for "ENOTFOUND" pattern', () => {
      expect(classifyErrorCategory('getaddrinfo ENOTFOUND example.com')).toBe('network_error');
    });

    it('is case-insensitive', () => {
      expect(classifyErrorCategory('econnrefused connection')).toBe('network_error');
    });

    // PAT-3: Socket hang up
    it('returns network_error for "socket hang up" pattern (PAT-3)', () => {
      expect(classifyErrorCategory('socket hang up')).toBe('network_error');
    });

    // PAT-4: Fetch failed
    it('returns network_error for "fetch failed" pattern (PAT-4)', () => {
      expect(classifyErrorCategory('fetch failed: unable to connect')).toBe('network_error');
    });

    // PAT-5: ETIMEDOUT
    it('returns network_error for "etimedout" pattern (PAT-5)', () => {
      expect(classifyErrorCategory('connect ETIMEDOUT 10.0.0.1:9200')).toBe('network_error');
    });
  });

  describe('permission_error', () => {
    it('returns permission_error for "forbidden" pattern', () => {
      expect(classifyErrorCategory('403 Forbidden')).toBe('permission_error');
    });

    it('returns permission_error for "403" pattern', () => {
      expect(classifyErrorCategory('HTTP status code 403')).toBe('permission_error');
    });

    it('returns permission_error for "unauthorized" pattern', () => {
      expect(classifyErrorCategory('Request unauthorized')).toBe('permission_error');
    });

    it('returns permission_error for "401" pattern', () => {
      expect(classifyErrorCategory('HTTP 401 error')).toBe('permission_error');
    });

    it('is case-insensitive', () => {
      expect(classifyErrorCategory('FORBIDDEN')).toBe('permission_error');
    });

    // PAT-6: Insufficient privileges
    it('returns permission_error for "insufficient privileges" pattern (PAT-6)', () => {
      expect(classifyErrorCategory('insufficient privileges to perform this action')).toBe(
        'permission_error'
      );
    });

    // PAT-7: Security exception
    it('returns permission_error for "security_exception" pattern (PAT-7)', () => {
      expect(classifyErrorCategory('security_exception: action [indices:data/read/search]')).toBe(
        'permission_error'
      );
    });
  });

  describe('concurrent_conflict', () => {
    it('returns concurrent_conflict for "409" pattern', () => {
      expect(classifyErrorCategory('HTTP 409 Conflict')).toBe('concurrent_conflict');
    });

    it('returns concurrent_conflict for "version_conflict" pattern', () => {
      expect(classifyErrorCategory('version_conflict_engine_exception')).toBe(
        'concurrent_conflict'
      );
    });

    it('returns concurrent_conflict for "version conflict" pattern', () => {
      expect(classifyErrorCategory('document version conflict')).toBe('concurrent_conflict');
    });

    it('returns concurrent_conflict for "conflict" pattern', () => {
      expect(classifyErrorCategory('resource conflict detected')).toBe('concurrent_conflict');
    });

    it('is case-insensitive', () => {
      expect(classifyErrorCategory('CONFLICT')).toBe('concurrent_conflict');
    });

    // BUG-4: Generation phase cancellation
    it('returns concurrent_conflict for "was cancelled" in generation phase (BUG-4)', () => {
      expect(classifyErrorCategory('Generation workflow was cancelled')).toBe(
        'concurrent_conflict'
      );
    });

    // BUG-5: Validation phase cancellation
    it('returns concurrent_conflict for "was cancelled" in validation phase (BUG-5)', () => {
      expect(classifyErrorCategory('Validation workflow was cancelled')).toBe(
        'concurrent_conflict'
      );
    });

    // BUG-6: Alert retrieval phase cancellation
    it('returns concurrent_conflict for "was cancelled" in alert retrieval phase (BUG-6)', () => {
      expect(classifyErrorCategory('Alert retrieval workflow was cancelled')).toBe(
        'concurrent_conflict'
      );
    });

    // BUG-7: Generic cancellation
    it('returns concurrent_conflict for "was cancelled" generic pattern (BUG-7)', () => {
      expect(classifyErrorCategory('Execution was cancelled by a concurrent request')).toBe(
        'concurrent_conflict'
      );
    });
  });

  describe('cluster_health', () => {
    it('returns cluster_health for "no_shard_available" pattern', () => {
      expect(classifyErrorCategory('no_shard_available_action_exception')).toBe('cluster_health');
    });

    it('returns cluster_health for "cluster_block" pattern', () => {
      expect(classifyErrorCategory('cluster_block_exception: index is read-only')).toBe(
        'cluster_health'
      );
    });

    it('is case-insensitive', () => {
      expect(classifyErrorCategory('NO_SHARD_AVAILABLE')).toBe('cluster_health');
    });

    // PAT-1: Circuit breaker
    it('returns cluster_health for "circuit_breaking_exception" pattern (PAT-1)', () => {
      expect(classifyErrorCategory('circuit_breaking_exception: Data too large')).toBe(
        'cluster_health'
      );
    });

    // PAT-2: ES rejected execution
    it('returns cluster_health for "es_rejected_execution" pattern (PAT-2)', () => {
      expect(classifyErrorCategory('es_rejected_execution_exception: queue capacity reached')).toBe(
        'cluster_health'
      );
    });
  });

  describe('anonymization_error', () => {
    it('returns anonymization_error for "anonymization" pattern', () => {
      expect(classifyErrorCategory('anonymization pipeline failed')).toBe('anonymization_error');
    });

    it('is case-insensitive', () => {
      expect(classifyErrorCategory('ANONYMIZATION error occurred')).toBe('anonymization_error');
    });
  });

  describe('step_registration_error', () => {
    it('returns step_registration_error for "not registered" pattern', () => {
      expect(classifyErrorCategory('step type is not registered')).toBe('step_registration_error');
    });

    it('returns step_registration_error for "unknown step" pattern', () => {
      expect(classifyErrorCategory('unknown step type: my.custom.step')).toBe(
        'step_registration_error'
      );
    });

    it('is case-insensitive', () => {
      expect(classifyErrorCategory('NOT REGISTERED')).toBe('step_registration_error');
    });
  });

  describe('timeout', () => {
    it('returns timeout for "timeout" pattern', () => {
      expect(classifyErrorCategory('Request timed out after 30s')).toBe('timeout');
    });

    it('returns timeout for "timed out" pattern', () => {
      expect(classifyErrorCategory('Connection timed out')).toBe('timeout');
    });

    it('is case-insensitive', () => {
      expect(classifyErrorCategory('TIMEOUT')).toBe('timeout');
    });
  });

  describe('connector_error', () => {
    it('returns connector_error for "connector" pattern', () => {
      expect(classifyErrorCategory('Connector not found: abc-123')).toBe('connector_error');
    });

    it('is case-insensitive', () => {
      expect(classifyErrorCategory('CONNECTOR failed')).toBe('connector_error');
    });
  });

  describe('validation_error', () => {
    it('returns validation_error for "validat" pattern', () => {
      expect(classifyErrorCategory('Validation failed: invalid schema')).toBe('validation_error');
    });

    it('returns validation_error for "validate" pattern', () => {
      expect(classifyErrorCategory('Failed to validate discoveries')).toBe('validation_error');
    });

    it('is case-insensitive', () => {
      expect(classifyErrorCategory('VALIDATION error')).toBe('validation_error');
    });
  });

  describe('workflow_error', () => {
    it('returns workflow_error for generic "workflow" pattern', () => {
      expect(classifyErrorCategory('Workflow execution failed')).toBe('workflow_error');
    });

    it('is case-insensitive', () => {
      expect(classifyErrorCategory('WORKFLOW error')).toBe('workflow_error');
    });
  });

  describe('unknown', () => {
    it('returns unknown for unrecognized messages', () => {
      expect(classifyErrorCategory('Something went wrong')).toBe('unknown');
    });

    it('returns unknown for empty string', () => {
      expect(classifyErrorCategory('')).toBe('unknown');
    });
  });

  describe('precedence', () => {
    it('prefers workflow_disabled over workflow_error', () => {
      expect(classifyErrorCategory('Alert retrieval workflow is not enabled: wf-abc')).toBe(
        'workflow_disabled'
      );
    });

    it('prefers workflow_deleted over workflow_error', () => {
      expect(classifyErrorCategory("Workflow 'wf-abc' not found")).toBe('workflow_deleted');
    });

    it('prefers workflow_invalid over workflow_error', () => {
      expect(classifyErrorCategory("Workflow 'wf-abc' is not valid")).toBe('workflow_invalid');
    });

    it('prefers rate_limit over unknown', () => {
      expect(classifyErrorCategory('HTTP 429 Too Many Requests')).toBe('rate_limit');
    });

    it('prefers timeout over connector_error when both keywords present', () => {
      // "timeout" should NOT match "connector" here — just testing that timeout is returned
      // when the message contains "timeout" but not "connector"
      expect(classifyErrorCategory('operation timed out')).toBe('timeout');
    });

    it('prefers connector_error when message contains "connector" but not timeout/validation/workflow', () => {
      expect(classifyErrorCategory('Connector abc failed to execute')).toBe('connector_error');
    });
  });
});
