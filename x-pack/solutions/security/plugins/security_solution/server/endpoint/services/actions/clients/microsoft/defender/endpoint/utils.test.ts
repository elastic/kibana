/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createActionThrottle, clearAllThrottles } from './utils';

describe('Microsoft Defender Endpoint Utils', () => {
  beforeEach(() => {
    // Clear any existing throttles between tests
    jest.clearAllMocks();
    clearAllThrottles();
  });

  describe('throttling factory', () => {
    const testSpaceId = 'test-space';

    it('should return false for non-throttled action', () => {
      const throttle = createActionThrottle('runscript', 'test-agent-1', testSpaceId);
      expect(throttle.isThrottled).toBe(false);
    });

    it('should return true for throttled action', () => {
      const throttle = createActionThrottle('runscript', 'test-agent-1', testSpaceId);

      // Set throttle
      throttle.setThrottle();

      // Check if throttled
      expect(throttle.isThrottled).toBe(true);
    });

    it('should throttle per-agent independently', () => {
      const throttleAgent1 = createActionThrottle('runscript', 'test-agent-1', testSpaceId);
      const throttleAgent2 = createActionThrottle('runscript', 'test-agent-2', testSpaceId);

      // Set throttle for agent-1
      throttleAgent1.setThrottle();

      // Agent-1 should be throttled
      expect(throttleAgent1.isThrottled).toBe(true);

      // Agent-2 should not be throttled
      expect(throttleAgent2.isThrottled).toBe(false);
    });

    it('should throttle per-command independently', () => {
      const runscriptThrottle = createActionThrottle('runscript', 'test-agent-1', testSpaceId);
      const isolateThrottle = createActionThrottle('isolate', 'test-agent-1', testSpaceId);

      // Set throttle for runscript command
      runscriptThrottle.setThrottle();

      // runscript should be throttled
      expect(runscriptThrottle.isThrottled).toBe(true);

      // isolate should not be throttled (different command)
      expect(isolateThrottle.isThrottled).toBe(false);
    });

    it('should isolate throttles per-space (multi-tenant isolation)', () => {
      const spaceA = 'customer-a';
      const spaceB = 'customer-b';
      const command = 'runscript';
      const agentId = 'shared-agent-123';

      const throttleSpaceA = createActionThrottle(command, agentId, spaceA);
      const throttleSpaceB = createActionThrottle(command, agentId, spaceB);

      // Set throttle in space A
      throttleSpaceA.setThrottle();

      // Space A should be throttled
      expect(throttleSpaceA.isThrottled).toBe(true);

      // Space B should NOT be throttled (different space)
      expect(throttleSpaceB.isThrottled).toBe(false);

      // Set throttle in space B too
      throttleSpaceB.setThrottle();

      // Now both spaces should be throttled independently
      expect(throttleSpaceA.isThrottled).toBe(true);
      expect(throttleSpaceB.isThrottled).toBe(true);
    });

    it('should use correct cache key format with space isolation', () => {
      const command = 'runscript';
      const agentId = 'test-agent-123';
      const spaceId = 'production-space';

      const throttleTarget = createActionThrottle(command, agentId, spaceId);
      const throttleDiffCommand = createActionThrottle('isolate', agentId, spaceId);
      const throttleDiffAgent = createActionThrottle(command, 'different-agent', spaceId);
      const throttleDiffSpace = createActionThrottle(command, agentId, 'different-space');

      throttleTarget.setThrottle();

      // The throttle should be set for the exact combination
      expect(throttleTarget.isThrottled).toBe(true);

      // Different combinations should not be throttled
      expect(throttleDiffCommand.isThrottled).toBe(false);
      expect(throttleDiffAgent.isThrottled).toBe(false);
      expect(throttleDiffSpace.isThrottled).toBe(false);
    });

    it('should handle multiple throttles independently across spaces', () => {
      // Create throttle controllers for different combinations
      const runscriptAgent1SpaceA = createActionThrottle('runscript', 'agent-1', 'space-a');
      const runscriptAgent2SpaceA = createActionThrottle('runscript', 'agent-2', 'space-a');
      const runscriptAgent1SpaceB = createActionThrottle('runscript', 'agent-1', 'space-b');
      const isolateAgent1SpaceA = createActionThrottle('isolate', 'agent-1', 'space-a');

      // Test cross-space isolation controls
      const isolateAgent1SpaceB = createActionThrottle('isolate', 'agent-1', 'space-b');
      const runscriptAgent2SpaceB = createActionThrottle('runscript', 'agent-2', 'space-b');
      const cancelAgent1SpaceA = createActionThrottle('cancel', 'agent-1', 'space-a');

      // Set multiple throttles across different spaces
      runscriptAgent1SpaceA.setThrottle();
      runscriptAgent2SpaceA.setThrottle();
      runscriptAgent1SpaceB.setThrottle();
      isolateAgent1SpaceA.setThrottle();

      // All should be throttled independently within their spaces
      expect(runscriptAgent1SpaceA.isThrottled).toBe(true);
      expect(runscriptAgent2SpaceA.isThrottled).toBe(true);
      expect(runscriptAgent1SpaceB.isThrottled).toBe(true);
      expect(isolateAgent1SpaceA.isThrottled).toBe(true);

      // Cross-space isolation - agent-1 throttled in space-a doesn't affect space-b
      expect(isolateAgent1SpaceB.isThrottled).toBe(false);
      expect(runscriptAgent2SpaceB.isThrottled).toBe(false);
      expect(cancelAgent1SpaceA.isThrottled).toBe(false);
    });

    it('should create independent throttle controllers for same parameters', () => {
      const throttle1 = createActionThrottle('runscript', 'agent-1', testSpaceId);
      const throttle2 = createActionThrottle('runscript', 'agent-1', testSpaceId);

      // They should access the same underlying cache entry
      throttle1.setThrottle();
      expect(throttle2.isThrottled).toBe(true);

      // But they are independent objects
      expect(throttle1).not.toBe(throttle2);
    });

    it('should clear all throttles when clearAllThrottles is called', () => {
      const throttle1 = createActionThrottle('runscript', 'agent-1', testSpaceId);
      const throttle2 = createActionThrottle('isolate', 'agent-2', testSpaceId);
      const throttle3 = createActionThrottle('runscript', 'agent-1', 'different-space');

      // Set throttles for all combinations
      throttle1.setThrottle();
      throttle2.setThrottle();
      throttle3.setThrottle();

      // Verify they are all throttled
      expect(throttle1.isThrottled).toBe(true);
      expect(throttle2.isThrottled).toBe(true);
      expect(throttle3.isThrottled).toBe(true);

      // Clear all throttles
      clearAllThrottles();

      // Verify they are all cleared
      expect(throttle1.isThrottled).toBe(false);
      expect(throttle2.isThrottled).toBe(false);
      expect(throttle3.isThrottled).toBe(false);
    });

    // Note: TTL expiration testing would require mocking the SimpleMemCache
    // or waiting for the actual 10-second timeout, which is not practical in unit tests
  });
});
