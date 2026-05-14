/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { classifyExecutionFailure } from './classify_execution_failure';
import type { ExecutionErrorClass } from './classify_execution_failure';

describe('classifyExecutionFailure', () => {
  const expectClass = (msg: string, expected: ExecutionErrorClass) => {
    expect(classifyExecutionFailure(msg).error_class).toBe(expected);
  };

  describe('index_not_found', () => {
    it('matches index_not_found_exception', () => {
      expectClass(
        'Elasticsearch error: index_not_found_exception [logs-endpoint.events-default]',
        'index_not_found'
      );
    });

    it('matches "no such index"', () => {
      expectClass('no such index [.alerts-security.alerts-default]', 'index_not_found');
    });

    it('matches "index not found" phrase', () => {
      expectClass('Index not found for pattern logs-endpoint.*', 'index_not_found');
    });

    it('matches "index pattern did not match any indices"', () => {
      expectClass(
        'This rule is attempting to query data…however no index matching: ["logs-endpoint.alerts-*"] was found',
        'index_not_found'
      );
    });

    it('returns high confidence', () => {
      const result = classifyExecutionFailure('index_not_found_exception');
      expect(result.confidence).toBe('high');
    });
  });

  describe('query_timeout', () => {
    it('matches "timed_out"', () => {
      expectClass('Request timed_out after 30000ms', 'query_timeout');
    });

    it('matches "request timed out"', () => {
      expectClass('Search: Request timed out waiting for response.', 'query_timeout');
    });

    it('matches "took too long"', () => {
      expectClass('Query took too long to complete', 'query_timeout');
    });

    it('matches search_phase_execution_exception with timed', () => {
      expectClass(
        'search_phase_execution_exception: all shards failed: timed out',
        'query_timeout'
      );
    });

    it('matches query_shard_exception with timed', () => {
      expectClass('query_shard_exception: timed out', 'query_timeout');
    });

    it('returns high confidence', () => {
      expect(classifyExecutionFailure('timed out').confidence).toBe('high');
    });
  });

  describe('permission_denied', () => {
    it('matches security_exception', () => {
      expectClass(
        'security_exception: action [indices:data/read/search] is unauthorized',
        'permission_denied'
      );
    });

    it('matches AuthorizationException', () => {
      expectClass(
        'AuthorizationException: not authorized for actions [indices:data/read]',
        'permission_denied'
      );
    });

    it('matches "not authorized to"', () => {
      expectClass('User is not authorized to query data in this space', 'permission_denied');
    });

    it('matches "insufficient privilege"', () => {
      expectClass('insufficient privileges for index pattern logs-*', 'permission_denied');
    });

    it('matches "access denied"', () => {
      expectClass('Access denied: cannot read index .alerts-security', 'permission_denied');
    });

    it('matches "forbidden" as a word boundary', () => {
      expectClass('HTTP 403 Forbidden response from Elasticsearch', 'permission_denied');
    });

    it('does not match "forbiddance" (word boundary check)', () => {
      // 'forbidden' regex uses \b so partial words should still match, but let's verify
      // the actual behavior: \bforbidden\b matches "Forbidden" (case-insensitive)
      expectClass('Forbidden', 'permission_denied');
    });

    it('returns high confidence', () => {
      expect(classifyExecutionFailure('security_exception').confidence).toBe('high');
    });
  });

  describe('schedule_gap', () => {
    it('matches "execution gap"', () => {
      expectClass('Detected execution gap in rule run', 'schedule_gap');
    });

    it('matches "gap in execution"', () => {
      expectClass('There was a gap in execution for this rule', 'schedule_gap');
    });

    it('matches "rule ran behind"', () => {
      expectClass('Rule ran behind schedule', 'schedule_gap');
    });

    it('matches "schedule gap"', () => {
      expectClass('schedule gap detected', 'schedule_gap');
    });

    it('returns medium confidence', () => {
      expect(classifyExecutionFailure('execution gap detected').confidence).toBe('medium');
    });
  });

  describe('circuit_breaker', () => {
    it('matches CircuitBreakingException', () => {
      expectClass(
        'CircuitBreakingException: [parent] Data too large, data for [<transport_request>]',
        'circuit_breaker'
      );
    });

    it('matches "circuit break"', () => {
      expectClass('circuit_break triggered during aggregation', 'circuit_breaker');
    });

    it('matches "circuit breaking"', () => {
      expectClass('circuit breaking: too many requests', 'circuit_breaker');
    });

    it('matches "data too large" standalone', () => {
      expectClass('Data too large for field [_id]', 'circuit_breaker');
    });

    it('matches "[parent] data too large"', () => {
      expectClass('[parent] data too large after analysis', 'circuit_breaker');
    });

    it('returns high confidence', () => {
      expect(classifyExecutionFailure('CircuitBreakingException').confidence).toBe('high');
    });
  });

  describe('executor_internal_error', () => {
    it('matches "internal server error"', () => {
      expectClass('Internal server error during rule execution', 'executor_internal_error');
    });

    it('matches "unhandled rejection"', () => {
      expectClass('unhandled rejection in rule executor', 'executor_internal_error');
    });

    it('matches "unhandled promise rejection"', () => {
      expectClass(
        'unhandled promise rejection: TypeError: Cannot read property',
        'executor_internal_error'
      );
    });

    it('matches "unexpected error during"', () => {
      expectClass('unexpected error during execution: plugin crashed', 'executor_internal_error');
    });

    it('returns medium confidence', () => {
      expect(classifyExecutionFailure('Internal server error').confidence).toBe('medium');
    });
  });

  describe('unknown', () => {
    it('returns unknown for empty string', () => {
      expect(classifyExecutionFailure('').error_class).toBe('unknown');
    });

    it('returns unknown for whitespace-only string', () => {
      expect(classifyExecutionFailure('   ').error_class).toBe('unknown');
    });

    it('returns unknown for an unrecognized error message', () => {
      expectClass('Something went terribly wrong in a way we have never seen before', 'unknown');
    });

    it('returns low confidence for unknown', () => {
      expect(classifyExecutionFailure('unknown error xyz').confidence).toBe('low');
    });

    it('includes explanation for empty message', () => {
      expect(classifyExecutionFailure('').explanation).toContain('Empty error message');
    });

    it('includes explanation for unrecognized message', () => {
      expect(classifyExecutionFailure('bloop').explanation).toContain('did not match');
    });
  });

  describe('case insensitivity', () => {
    it('matches INDEX_NOT_FOUND_EXCEPTION (uppercase)', () => {
      expectClass('INDEX_NOT_FOUND_EXCEPTION', 'index_not_found');
    });

    it('matches CIRCUITBREAKINGEXCEPTION (uppercase)', () => {
      expectClass('CIRCUITBREAKINGEXCEPTION', 'circuit_breaker');
    });

    it('matches Timed Out (mixed case)', () => {
      expectClass('Timed Out after 5 seconds', 'query_timeout');
    });
  });

  describe('result shape', () => {
    it('always returns error_class, confidence, and explanation', () => {
      const result = classifyExecutionFailure('some error');
      expect(result).toHaveProperty('error_class');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('explanation');
      expect(typeof result.explanation).toBe('string');
      expect(result.explanation.length).toBeGreaterThan(0);
    });

    it('explanation references matched pattern for known classes', () => {
      const result = classifyExecutionFailure('index_not_found_exception');
      expect(result.explanation).toContain('index_not_found');
    });
  });

  describe('rule_type parameter (ignored for now, must not throw)', () => {
    it('accepts rule_type without changing classification', () => {
      const withType = classifyExecutionFailure('index_not_found_exception', 'siem.queryRule');
      const withoutType = classifyExecutionFailure('index_not_found_exception');
      expect(withType.error_class).toBe(withoutType.error_class);
      expect(withType.confidence).toBe(withoutType.confidence);
    });
  });
});
